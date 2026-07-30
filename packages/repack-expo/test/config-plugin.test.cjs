const assert = require('node:assert/strict');
const test = require('node:test');

const {
  configureAndroidBuildGradle,
  configureAndroidMainApplication,
} = require('../dist/config/android.js');
const { ConfigPluginError } = require('../dist/config/ConfigPluginError.js');
const {
  configureIosAppDelegate,
  configureIosBundleScript,
  findIosBundlePhase,
} = require('../dist/config/ios.js');
const { normalizeConfigPluginOptions } = require('../dist/config/options.js');
const { validateExpoConfig } = require('../dist/config/validateExpoConfig.js');

const IOS_APP_DELEGATE = `class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}`;

const IOS_BUNDLE_SCRIPT = `if [[ -z "$CLI_PATH" ]]; then
  # Use Expo CLI
  export CLI_PATH="$("$NODE_BINARY" --print "require.resolve('@expo/cli', { paths: [require.resolve('expo/package.json')] })")"
fi
if [[ -z "$BUNDLE_COMMAND" ]]; then
  # Default Expo CLI command for bundling
  export BUNDLE_COMMAND="export:embed"
fi

\`"$NODE_BINARY" --print "require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'"\`
`;

const ANDROID_MAIN_APPLICATION = `class MainApplication : Application(), ReactApplication {
  override val reactHost: ReactHost by lazy {
    ExpoReactHostFactory.getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages
    )
  }
}`;

const ANDROID_BUILD_GRADLE = `react {
    entryFile = file("entry.js")
    // Use Expo CLI to bundle the app, this ensures the Metro config
    // works correctly with Expo projects.
    cliFile = new File(["node", "--print", "require.resolve('@expo/cli', { paths: [require.resolve('expo/package.json')] })"].execute(null, rootDir).text.trim())
    bundleCommand = "export:embed"
    autolinkLibrariesWithApp()
}`;

test('validates the supported Expo native runtime contract', () => {
  assert.doesNotThrow(() =>
    validateExpoConfig({
      name: 'fixture',
      slug: 'fixture',
      updates: { enabled: false },
    })
  );

  for (const [config, code] of [
    [
      { name: 'fixture', newArchEnabled: false, slug: 'fixture' },
      'NEW_ARCH_REQUIRED',
    ],
    [
      {
        jsEngine: 'jsc',
        name: 'fixture',
        slug: 'fixture',
      },
      'HERMES_REQUIRED',
    ],
    [
      {
        name: 'fixture',
        slug: 'fixture',
        updates: { enabled: true },
      },
      'ACTIVE_EXPO_UPDATES',
    ],
  ]) {
    assert.throws(
      () => validateExpoConfig(config),
      (error) => {
        assert.equal(error.code, code);
        assert.equal(typeof error.recovery, 'string');
        return true;
      }
    );
  }
});

test('includes recovery guidance in the displayed Config Plugin error', () => {
  const error = new ConfigPluginError({
    code: 'INVALID_OPTIONS',
    message: 'The Config Plugin options are invalid.',
    recovery: 'Remove the unsupported option.',
  });

  assert.equal(error.recovery, 'Remove the unsupported option.');
  assert.equal(
    error.message,
    'The Config Plugin options are invalid.\n\nRecovery: Remove the unsupported option.'
  );
  assert.equal(
    error.toString(),
    'RepackExpoConfigPluginError: The Config Plugin options are invalid.\n\nRecovery: Remove the unsupported option.'
  );
});

test('configures the iOS Debug URL without disturbing Expo release loading', () => {
  const once = configureIosAppDelegate(IOS_APP_DELEGATE, 'swift');
  const twice = configureIosAppDelegate(once, 'swift');

  assert.equal(twice, once);
  assert.match(once, /forBundleRoot: "index"/);
  assert.doesNotMatch(once, /virtual-metro-entry/);
  assert.match(once, /bridge\.bundleURL \?\? bundleURL\(\)/);
  assert.match(once, /Bundle\.main\.url\(forResource: "main"/);
  assert.equal(once.match(/repack-expo-ios-bundle-url/g).length, 2);
  assert.throws(
    () => configureIosAppDelegate(IOS_APP_DELEGATE, 'objc'),
    (error) => error.code === 'INCOMPATIBLE_NATIVE_TEMPLATE'
  );

  assert.throws(
    () =>
      configureIosAppDelegate(
        once.replace('forBundleRoot: "index"', 'forBundleRoot: "custom"'),
        'swift'
      ),
    (error) => error.code === 'INCOMPATIBLE_NATIVE_TEMPLATE'
  );
});

test('adds the final Re.Pack iOS bundle command override once', () => {
  const once = configureIosBundleScript(IOS_BUNDLE_SCRIPT);
  const twice = configureIosBundleScript(once);

  assert.equal(twice, once);
  assert.equal(once.match(/repack-expo-ios-bundle-command/g).length, 2);
  assert.match(once, /@react-native-community\/cli\/build\/bin\.js/);
  const invocationIndex = once.indexOf('react-native-xcode.sh');
  assert.ok(
    once.lastIndexOf('export BUNDLE_COMMAND="bundle"') < invocationIndex
  );
  assert.ok(once.lastIndexOf('export CLI_PATH=') < invocationIndex);

  assert.throws(
    () =>
      configureIosBundleScript(
        once.replace(
          'export BUNDLE_COMMAND="bundle"',
          'export BUNDLE_COMMAND="custom"'
        )
      ),
    (error) => error.code === 'INCOMPATIBLE_NATIVE_TEMPLATE'
  );
  assert.throws(
    () =>
      configureIosBundleScript(
        once.replace(
          '# @generated end repack-expo-ios-bundle-command',
          'export CUSTOM_FLAG="1"\n# @generated end repack-expo-ios-bundle-command'
        )
      ),
    (error) => error.code === 'INCOMPATIBLE_NATIVE_TEMPLATE'
  );
  assert.throws(
    () =>
      configureIosBundleScript(
        IOS_BUNDLE_SCRIPT.replace(
          'export BUNDLE_COMMAND="export:embed"',
          'export BUNDLE_COMMAND="custom"'
        )
      ),
    (error) => error.code === 'INCOMPATIBLE_NATIVE_TEMPLATE'
  );
});

test('wraps malformed Xcode application targets in an actionable error', () => {
  assert.throws(
    () =>
      findIosBundlePhase(
        {
          getTarget() {
            return undefined;
          },
        },
        'Fixture'
      ),
    (error) => {
      assert.equal(error.code, 'INCOMPATIBLE_NATIVE_TEMPLATE');
      assert.match(error.message, /application target.*build phases/i);
      assert.match(error.recovery, /expo prebuild --clean/);
      return true;
    }
  );

  assert.throws(
    () =>
      findIosBundlePhase(
        {
          getTarget() {
            return { target: {} };
          },
        },
        'Fixture'
      ),
    (error) => error.code === 'INCOMPATIBLE_NATIVE_TEMPLATE'
  );
});

test('configures the Expo Android ReactHost main module once', () => {
  const once = configureAndroidMainApplication(ANDROID_MAIN_APPLICATION, 'kt');
  const twice = configureAndroidMainApplication(once, 'kt');

  assert.equal(twice, once);
  assert.match(once, /jsMainModulePath = "index"/);
  assert.equal(once.match(/repack-expo-android-main-module/g).length, 2);
  assert.match(once, /ExpoReactHostFactory\.getDefaultReactHost/);
  assert.throws(
    () => configureAndroidMainApplication(ANDROID_MAIN_APPLICATION, 'java'),
    (error) => error.code === 'INCOMPATIBLE_NATIVE_TEMPLATE'
  );
});

test('replaces only the Expo Android bundle command block', () => {
  const once = configureAndroidBuildGradle(ANDROID_BUILD_GRADLE);
  const twice = configureAndroidBuildGradle(once);

  assert.equal(twice, once);
  assert.doesNotMatch(once, /@expo\/cli|export:embed/);
  assert.match(once, /@react-native-community\/cli\/build\/bin\.js/);
  assert.match(once, /bundleCommand = "bundle"/);
  assert.match(once, /entryFile = file\("entry\.js"\)/);
  assert.match(once, /autolinkLibrariesWithApp\(\)/);
  assert.equal(once.match(/repack-expo-android-bundle-command/g).length, 2);
});

test('plumbs custom entry and Rspack config into native bundle commands', () => {
  const options = {
    configPath: 'config/rspack.native.mjs',
    entry: 'src/main.ts',
  };
  const ios = configureIosBundleScript(IOS_BUNDLE_SCRIPT, options);
  const android = configureAndroidBuildGradle(ANDROID_BUILD_GRADLE, options);

  assert.match(ios, /ENTRY_FILE="\$PROJECT_ROOT\/src\/main\.ts"/);
  assert.match(
    ios,
    /BUNDLE_CONFIG="\$PROJECT_ROOT\/config\/rspack\.native\.mjs"/
  );
  assert.match(
    android,
    /entryFile = rootProject\.file\("\.\.\/src\/main\.ts"\)/
  );
  assert.match(
    android,
    /bundleConfig = rootProject\.file\("\.\.\/config\/rspack\.native\.mjs"\)/
  );
  assert.equal(configureIosBundleScript(ios, options), ios);
  assert.equal(configureAndroidBuildGradle(android, options), android);
});

test('rejects malformed Config Plugin options actionably', () => {
  for (const options of [null, [], 'rspack.config.mjs', { entry: '' }]) {
    assert.throws(
      () => normalizeConfigPluginOptions(options),
      (error) => {
        assert.equal(error.code, 'INVALID_OPTIONS');
        assert.equal(typeof error.recovery, 'string');
        return true;
      }
    );
  }
});
