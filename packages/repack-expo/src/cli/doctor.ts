import fs from 'node:fs';
import path from 'node:path';
import { resolveExpoEntry } from '../rspack/entry/resolveExpoEntry.js';
import {
  CONFIG_PLUGIN,
  REQUIRED_DEV_DEPENDENCIES,
  REQUIRED_SCRIPTS,
  RSPACK_COMMANDS,
  RSPACK_CONFIG_NAMES,
  dynamicExpoConfig,
  diagnosticError as error,
  filesContain,
  findFiles,
  getConfigPluginRegistration,
  hasDependency,
  readJson,
  diagnosticWarning as warning,
} from './project.js';
import {
  getRspackFederationUsage,
  isRspackConfigCompatible,
} from './rspackConfig.js';
import type {
  ConfigPluginOptions,
  Diagnostic,
  DoctorOptions,
  DoctorResult,
  JsonObject,
  PackageJson,
} from './types.js';

function getStaticExpoConfig(
  projectRoot: string,
  packageJson: PackageJson
): { diagnostic?: Diagnostic; expo?: JsonObject } {
  const dynamicConfig = dynamicExpoConfig(projectRoot);
  if (dynamicConfig) {
    return {
      diagnostic: error(
        'DYNAMIC_EXPO_CONFIG',
        `${dynamicConfig} cannot be evaluated safely by doctor.`,
        'Verify the Re.Pack plugin, New Architecture, Hermes, and disabled Updates settings manually, or expose static app.json config.'
      ),
    };
  }
  const appJsonPath = path.join(projectRoot, 'app.json');
  try {
    const root = fs.existsSync(appJsonPath)
      ? readJson(appJsonPath)
      : packageJson.expo
        ? { expo: packageJson.expo }
        : undefined;
    if (
      !root?.expo ||
      typeof root.expo !== 'object' ||
      Array.isArray(root.expo)
    ) {
      return {
        diagnostic: error(
          'EXPO_CONFIG_MISSING',
          'No static Expo app config was found.',
          'Create app.json or a package.json#expo object.'
        ),
      };
    }
    return { expo: root.expo as JsonObject };
  } catch (cause) {
    return {
      diagnostic: error(
        'EXPO_CONFIG_INVALID',
        cause instanceof Error ? cause.message : String(cause),
        'Repair the static Expo app config.'
      ),
    };
  }
}

export function runDoctor(options: DoctorOptions = {}): DoctorResult {
  const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
  const diagnostics: Diagnostic[] = [];
  const packagePath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(packagePath)) {
    diagnostics.push(
      error(
        'PACKAGE_JSON_MISSING',
        `No package.json was found at ${projectRoot}.`,
        'Run doctor from an Expo application root.'
      )
    );
    return { diagnostics, errorCount: 1, ok: false, warningCount: 0 };
  }

  let packageJson: PackageJson;
  try {
    packageJson = readJson(packagePath) as PackageJson;
  } catch (cause) {
    diagnostics.push(
      error(
        'PACKAGE_JSON_INVALID',
        cause instanceof Error ? cause.message : String(cause),
        'Repair package.json and run doctor again.'
      )
    );
    return { diagnostics, errorCount: 1, ok: false, warningCount: 0 };
  }

  if (!hasDependency(packageJson, 'expo')) {
    diagnostics.push(
      error(
        'EXPO_DEPENDENCY_MISSING',
        'package.json does not declare Expo.',
        'Run doctor from an Expo application root.'
      )
    );
  }
  const staticConfig = getStaticExpoConfig(projectRoot, packageJson);
  if (staticConfig.diagnostic) diagnostics.push(staticConfig.diagnostic);
  const expo = staticConfig.expo;
  let configPluginOptions: ConfigPluginOptions = {};
  if (expo) {
    const updates = expo.updates;
    if (
      !updates ||
      typeof updates !== 'object' ||
      Array.isArray(updates) ||
      (updates as JsonObject).enabled !== false
    ) {
      diagnostics.unshift(
        error(
          (updates as JsonObject | undefined)?.enabled === true
            ? 'EXPO_UPDATES_ACTIVE'
            : 'EXPO_UPDATES_NOT_DISABLED',
          'Expo Updates must be explicitly disabled for the supported v1 path.',
          'Set expo.updates.enabled to false and run expo prebuild again.'
        )
      );
    }
    if (expo.newArchEnabled === false) {
      diagnostics.push(
        error(
          'NEW_ARCH_REQUIRED',
          'React Native New Architecture is explicitly disabled.',
          'Remove the expo.newArchEnabled=false override and run expo prebuild again.'
        )
      );
    }
    const engines = [
      expo.jsEngine,
      (expo.ios as JsonObject | undefined)?.jsEngine,
      (expo.android as JsonObject | undefined)?.jsEngine,
    ].filter((value) => value !== undefined);
    if (engines.some((engine) => engine !== 'hermes')) {
      diagnostics.push(
        error(
          'HERMES_REQUIRED',
          'The supported v1 path uses Hermes on every configured platform.',
          'Remove JSC overrides or set Expo jsEngine values to "hermes".'
        )
      );
    }
    const registration = getConfigPluginRegistration(expo);
    configPluginOptions = registration.options;
    if (registration.invalidReason) {
      diagnostics.push(
        error(
          'CONFIG_PLUGIN_OPTIONS_INVALID',
          registration.invalidReason,
          'Keep one valid Re.Pack Expo Config Plugin registration.'
        )
      );
    } else if (!registration.registered) {
      diagnostics.push(
        error(
          'CONFIG_PLUGIN_MISSING',
          `${CONFIG_PLUGIN} is not registered in Expo plugins.`,
          `Add ${JSON.stringify(CONFIG_PLUGIN)} to expo.plugins and run expo prebuild.`
        )
      );
    }
  }

  for (const dependency of REQUIRED_DEV_DEPENDENCIES) {
    if (!hasDependency(packageJson, dependency)) {
      diagnostics.push(
        error(
          'DEPENDENCY_MISSING',
          `${dependency} is not declared in package.json.`,
          `Add ${dependency} with your package manager and install dependencies.`
        )
      );
    }
  }

  const rnConfigPath = path.join(projectRoot, 'react-native.config.js');
  if (
    !fs.existsSync(rnConfigPath) ||
    !fs.readFileSync(rnConfigPath, 'utf8').includes(RSPACK_COMMANDS)
  ) {
    diagnostics.push(
      error(
        'RN_COMMANDS_MISSING',
        'React Native CLI is not configured with the Re.Pack Rspack commands.',
        `Register commands from require('${RSPACK_COMMANDS}') in react-native.config.js.`
      )
    );
  }

  const rspackNames = configPluginOptions.configPath
    ? fs.existsSync(path.resolve(projectRoot, configPluginOptions.configPath))
      ? [configPluginOptions.configPath]
      : []
    : RSPACK_CONFIG_NAMES.filter((name) =>
        fs.existsSync(path.join(projectRoot, name))
      );
  if (rspackNames.length === 0) {
    diagnostics.push(
      error(
        'RSPACK_CONFIG_MISSING',
        'rspack.config.mjs is missing.',
        'Run repack-expo init or create the supported ExpoPlugin configuration.'
      )
    );
  } else if (rspackNames.length > 1) {
    diagnostics.push(
      error(
        'RSPACK_CONFIG_AMBIGUOUS',
        `Multiple Rspack configs were found: ${rspackNames.join(', ')}.`,
        'Keep one supported native-client Rspack config.'
      )
    );
  } else {
    const rspackPath = path.resolve(projectRoot, rspackNames[0] as string);
    const contents = fs.readFileSync(rspackPath, 'utf8');
    const federation = getRspackFederationUsage(contents);
    if (federation === 'v1') {
      diagnostics.push(
        error(
          'MODULE_FEDERATION_V1_UNSUPPORTED',
          'Expo integration supports Module Federation v2 only.',
          'Replace the active federation plugin with Repack.plugins.ModuleFederationPluginV2.'
        )
      );
    } else if (federation === 'raw') {
      diagnostics.push(
        error(
          'MODULE_FEDERATION_RAW_PLUGIN_UNSUPPORTED',
          'Direct @module-federation/enhanced/rspack plugin usage bypasses the Re.Pack native runtime integration.',
          'Use Repack.plugins.ModuleFederationPluginV2 from @callstack/repack.'
        )
      );
    } else if (/new\s+(?:Repack\.)?RepackPlugin\s*\(/.test(contents)) {
      diagnostics.push(
        error(
          'REPACK_PLUGIN_DUPLICATE',
          'ExpoPlugin owns RepackPlugin and cannot be combined with another instance.',
          'Remove the application-owned RepackPlugin.'
        )
      );
    } else if (!isRspackConfigCompatible(contents)) {
      diagnostics.push(
        error(
          'EXPO_PLUGIN_MISSING',
          'rspack.config.mjs does not configure ExpoPlugin.',
          `Import ExpoPlugin from ${JSON.stringify(`${CONFIG_PLUGIN}/rspack`)} and add one instance.`
        )
      );
    }
  }

  for (const [name, command] of Object.entries(REQUIRED_SCRIPTS)) {
    if (packageJson.scripts?.[name] !== command) {
      diagnostics.push(
        error(
          'PACKAGE_SCRIPT_MISSING',
          `package.json script ${JSON.stringify(name)} does not match the supported command.`,
          `Set it to ${JSON.stringify(command)}.`
        )
      );
    }
  }

  for (const platform of ['ios', 'android'] as const) {
    try {
      resolveExpoEntry({
        entry: configPluginOptions.entry,
        platform,
        projectRoot,
      });
    } catch (cause) {
      const resolution = cause as {
        message?: unknown;
        recovery?: unknown;
      };
      diagnostics.push(
        error(
          'ENTRY_UNRESOLVED',
          typeof resolution.message === 'string'
            ? resolution.message
            : `Cannot resolve the Expo entry for ${platform}.`,
          typeof resolution.recovery === 'string'
            ? resolution.recovery
            : 'Correct the Config Plugin entry option or package.json#main.'
        )
      );
    }
  }

  if (
    [
      'webpack.config.mts',
      'webpack.config.cts',
      'webpack.config.ts',
      'webpack.config.mjs',
      'webpack.config.cjs',
      'webpack.config.js',
    ].some((name) => fs.existsSync(path.join(projectRoot, name)))
  ) {
    diagnostics.push(
      error(
        'WEBPACK_CONFIG_UNSUPPORTED',
        'A Webpack configuration was found; Expo v1 supports Rspack only.',
        'Remove the Webpack host setup from this supported native-client path.'
      )
    );
  }

  checkNativeProjects(projectRoot, diagnostics, configPluginOptions);

  const errorCount = diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'error'
  ).length;
  const warningCount = diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'warning'
  ).length;
  return { diagnostics, errorCount, ok: errorCount === 0, warningCount };
}

function checkNativeProjects(
  projectRoot: string,
  diagnostics: Diagnostic[],
  pluginOptions: ConfigPluginOptions
): void {
  const iosRoot = path.join(projectRoot, 'ios');
  const androidRoot = path.join(projectRoot, 'android');
  let nativeUpdatesActive = false;
  let nativeHermesMismatch = false;
  let nativeNewArchMismatch = false;
  let autolinkUnverified = false;
  if (fs.existsSync(iosRoot)) {
    const iosFiles = findFiles(
      iosRoot,
      (filePath) =>
        filePath.endsWith('.swift') || filePath.endsWith('project.pbxproj')
    );
    // Match the generated commands by their executable contract; generated
    // headers include hashes that are intentionally not stable inputs.
    const hasIosUrl = generatedSectionContains(
      iosFiles,
      'repack-expo-ios-bundle-url',
      [
        'return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")',
      ]
    );
    const hasIosCommands = generatedSectionContains(
      iosFiles,
      'repack-expo-ios-bundle-command',
      [
        'export CLI_PATH="$("$NODE_BINARY" --print',
        "require.resolve('@react-native-community/cli/build/bin.js')",
        'export BUNDLE_COMMAND="bundle"',
        ...iosOptionCommands(pluginOptions),
      ]
    );
    if (!hasIosUrl || !hasIosCommands) {
      diagnostics.push(
        error(
          'IOS_NATIVE_SEAMS_MISSING',
          'Generated iOS files do not contain both Re.Pack Expo integration seams.',
          'Run expo prebuild after registering the Config Plugin.'
        )
      );
    }
    const podLock = path.join(iosRoot, 'Podfile.lock');
    if (!fs.existsSync(podLock)) {
      autolinkUnverified = true;
    } else if (!/callstack-repack/.test(fs.readFileSync(podLock, 'utf8'))) {
      diagnostics.push(
        error(
          'SCRIPTMANAGER_NOT_AUTOLINKED',
          'The iOS Pods lockfile does not contain the Re.Pack native module.',
          'Install pods after adding @callstack/repack, then regenerate the native project.'
        )
      );
    }
    const expoPlists = findFiles(iosRoot, (filePath) =>
      filePath.endsWith('Expo.plist')
    );
    nativeUpdatesActive ||= filesContain(
      expoPlists,
      /<key>\s*EXUpdatesEnabled\s*<\/key>\s*<true\s*\/>/
    );
    const podPropertiesPath = path.join(iosRoot, 'Podfile.properties.json');
    if (fs.existsSync(podPropertiesPath)) {
      try {
        const properties = readJson(podPropertiesPath);
        nativeHermesMismatch ||=
          properties['expo.jsEngine'] !== undefined &&
          properties['expo.jsEngine'] !== 'hermes';
      } catch {
        diagnostics.push(
          error(
            'IOS_PROPERTIES_INVALID',
            'ios/Podfile.properties.json is not valid JSON.',
            'Regenerate the iOS project with expo prebuild.'
          )
        );
      }
    }
  }
  if (fs.existsSync(androidRoot)) {
    const androidFiles = findFiles(
      androidRoot,
      (filePath) =>
        /MainApplication\.(?:kt|java)$/.test(filePath) ||
        /build\.gradle(?:\.kts)?$/.test(filePath)
    );
    const hasAndroidMain = generatedSectionContains(
      androidFiles,
      'repack-expo-android-main-module',
      ['      jsMainModulePath = "index",']
    );
    const hasAndroidCommands = generatedSectionContains(
      androidFiles,
      'repack-expo-android-bundle-command',
      [
        'cliFile = new File(["node", "--print",',
        "require.resolve('@react-native-community/cli/build/bin.js')",
        'bundleCommand = "bundle"',
        ...androidOptionCommands(pluginOptions),
      ]
    );
    if (!hasAndroidMain || !hasAndroidCommands) {
      diagnostics.push(
        error(
          'ANDROID_NATIVE_SEAMS_MISSING',
          'Generated Android files do not contain both Re.Pack Expo integration seams.',
          'Run expo prebuild after registering the Config Plugin.'
        )
      );
    }
    const manifests = findFiles(androidRoot, (filePath) =>
      filePath.endsWith('AndroidManifest.xml')
    );
    nativeUpdatesActive ||= filesContain(
      manifests,
      /expo\.modules\.updates\.ENABLED[^>]+android:value=["']true["']/
    );
    const gradlePropertiesPath = path.join(androidRoot, 'gradle.properties');
    if (fs.existsSync(gradlePropertiesPath)) {
      const properties = fs.readFileSync(gradlePropertiesPath, 'utf8');
      nativeNewArchMismatch ||= /^newArchEnabled\s*=\s*false\s*$/m.test(
        properties
      );
      nativeHermesMismatch ||= /^hermesEnabled\s*=\s*false\s*$/m.test(
        properties
      );
    }
    const settingsPath = path.join(androidRoot, 'settings.gradle');
    const buildGradlePath = path.join(androidRoot, 'app', 'build.gradle');
    if (
      !fs.existsSync(settingsPath) ||
      !fs
        .readFileSync(settingsPath, 'utf8')
        .includes('autolinkLibrariesFromCommand') ||
      !fs.existsSync(buildGradlePath) ||
      !fs
        .readFileSync(buildGradlePath, 'utf8')
        .includes('autolinkLibrariesWithApp')
    ) {
      autolinkUnverified = true;
    }
  }
  if (nativeUpdatesActive) {
    diagnostics.push(
      error(
        'NATIVE_UPDATES_ACTIVE',
        'A generated native project still enables Expo Updates.',
        'Set expo.updates.enabled to false and regenerate native projects with expo prebuild.'
      )
    );
  }
  if (nativeHermesMismatch) {
    diagnostics.push(
      error(
        'NATIVE_HERMES_MISMATCH',
        'A generated native project is configured to use JSC instead of Hermes.',
        'Set Expo jsEngine values to "hermes" and regenerate native projects.'
      )
    );
  }
  if (nativeNewArchMismatch) {
    diagnostics.push(
      error(
        'NATIVE_NEW_ARCH_MISMATCH',
        'A generated native project disables React Native New Architecture.',
        'Remove the New Architecture disable override and regenerate native projects.'
      )
    );
  }
  if (autolinkUnverified) {
    diagnostics.push(
      warning(
        'SCRIPTMANAGER_AUTOLINK_UNVERIFIED',
        'Generated artifacts do not prove ScriptManager autolinking on every generated platform.',
        'Install native dependencies and regenerate the native projects, then rerun doctor.'
      )
    );
  }
  if (!fs.existsSync(iosRoot) && !fs.existsSync(androidRoot)) {
    diagnostics.push(
      warning(
        'NATIVE_PROJECTS_ABSENT',
        'No generated iOS or Android project is available to inspect.',
        'Run expo prebuild, then rerun doctor to validate native build seams.'
      )
    );
  }
}

function generatedSectionContains(
  files: string[],
  tag: string,
  expectedFragments: string[]
): boolean {
  let matches = 0;
  for (const filePath of files) {
    const contents = fs.readFileSync(filePath, 'utf8');
    const beginMarker = `@generated begin ${tag}`;
    const endMarker = `@generated end ${tag}`;
    if (
      contents.split(beginMarker).length - 1 !== 1 ||
      contents.split(endMarker).length - 1 !== 1
    ) {
      if (contents.includes(beginMarker) || contents.includes(endMarker)) {
        return false;
      }
      continue;
    }
    const begin = contents.indexOf(beginMarker);
    const end = contents.indexOf(endMarker, begin + 1);
    const section = contents
      .slice(begin, end)
      .replaceAll('\\"', '"')
      .replaceAll('\\n', '\n');
    if (!expectedFragments.every((fragment) => section.includes(fragment))) {
      return false;
    }
    matches += 1;
  }
  return matches === 1;
}

function iosOptionCommands(options: ConfigPluginOptions): string[] {
  const commands: string[] = [];
  if (options.entry) {
    commands.push(`export ENTRY_FILE="${iosProjectPath(options.entry)}"`);
  }
  if (options.configPath) {
    commands.push(
      `export BUNDLE_CONFIG="${iosProjectPath(options.configPath)}"`
    );
  }
  return commands;
}

function iosProjectPath(value: string): string {
  const escaped = value
    .replaceAll('\\', '\\\\')
    .replaceAll('"', '\\"')
    .replaceAll('$', '\\$')
    .replaceAll('`', '\\`');
  return value.startsWith('/') ? escaped : `$PROJECT_ROOT/${escaped}`;
}

function androidOptionCommands(options: ConfigPluginOptions): string[] {
  const commands: string[] = [];
  if (options.entry) {
    const entry = options.entry.startsWith('/')
      ? options.entry
      : `../${options.entry}`;
    commands.push(`entryFile = rootProject.file(${JSON.stringify(entry)})`);
  }
  if (options.configPath) {
    const configPath = options.configPath.startsWith('/')
      ? options.configPath
      : `../${options.configPath}`;
    commands.push(
      `bundleConfig = rootProject.file(${JSON.stringify(configPath)})`
    );
  }
  return commands;
}
