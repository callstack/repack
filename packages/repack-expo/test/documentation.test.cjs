const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { createProject } = require('./helpers/createCliProject.cjs');

const packageRoot = path.resolve(__dirname, '..');
const repositoryRoot = path.resolve(packageRoot, '..', '..');
const cliPath = path.join(packageRoot, 'dist', 'cli', 'bin.js');
const readme = fs.readFileSync(path.join(packageRoot, 'README.md'), 'utf8');
const hostRoot = path.join(repositoryRoot, 'apps', 'tester-expo');
const widgetRoot = path.join(repositoryRoot, 'apps', 'tester-expo-widget');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readReadmeSection(heading, nextHeading) {
  const start = readme.indexOf(heading);
  assert.notEqual(start, -1, `README is missing ${heading}`);
  const end = readme.indexOf(nextHeading, start + heading.length);
  assert.notEqual(end, -1, `README is missing ${nextHeading}`);
  return readme.slice(start, end);
}

function runCli(projectRoot, arguments_) {
  return spawnSync(process.execPath, [cliPath, ...arguments_], {
    cwd: projectRoot,
    encoding: 'utf8',
  });
}

test('the documented init, check, and doctor sequence works from a clean static SDK 56-shaped fixture', () => {
  const projectRoot = createProject({
    expoName: 'Documented Expo App',
    includeCommunityCli: false,
    name: 'documented-expo-app',
    prefix: 'repack-expo-documentation-',
    slug: 'documented-expo-app',
  });
  try {
    const initialized = runCli(projectRoot, ['init']);
    assert.equal(
      initialized.status,
      0,
      `${initialized.stdout}\n${initialized.stderr}`
    );
    assert.match(initialized.stdout, /Changed:/);
    assert.match(initialized.stdout, /then expo prebuild/);

    const dependencyInstalledPackage = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
    );
    dependencyInstalledPackage.devDependencies['@react-native-community/cli'] =
      '^20.0.0';
    fs.writeFileSync(
      path.join(projectRoot, 'package.json'),
      `${JSON.stringify(dependencyInstalledPackage, null, 2)}\n`
    );

    const checked = runCli(projectRoot, ['init', '--check']);
    assert.equal(checked.status, 0, `${checked.stdout}\n${checked.stderr}`);
    assert.match(checked.stdout, /setup is up to date/);

    const doctor = runCli(projectRoot, ['doctor']);
    assert.equal(doctor.status, 0, `${doctor.stdout}\n${doctor.stderr}`);
    assert.match(doctor.stdout, /Doctor passed/);

    const packageJson = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
    );
    assert.equal(
      packageJson.scripts['repack:start'],
      'react-native webpack-start'
    );
    assert.equal(
      packageJson.scripts['repack:ios'],
      'expo run:ios --no-bundler'
    );
    assert.equal(
      packageJson.scripts['repack:android'],
      'expo run:android --no-bundler'
    );

    const expo = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'app.json'), 'utf8')
    ).expo;
    assert.deepEqual(expo.updates, { enabled: false });
    assert.ok(expo.plugins.includes('@callstack/repack-expo'));
    assert.equal('newArchEnabled' in expo, false);
    assert.equal('jsEngine' in expo, false);
  } finally {
    fs.rmSync(projectRoot, { force: true, recursive: true });
  }
});

test('the guide keeps every workflow and unsupported boundary searchable', () => {
  for (const fragment of [
    'npx @callstack/repack-expo init',
    'npx expo prebuild --clean',
    'npm run repack:start',
    'npm run repack:ios',
    'npm run repack:android',
    'EAS_BUILD_DISABLE_BUNDLE_JAVASCRIPT_STEP',
    '## Migrating from Expo Metro',
    '## Troubleshooting',
    '## Support matrix',
    '| Webpack | Unsupported. |',
    '| Expo Go | Unsupported. |',
    '| `expo-dev-client` launcher, QR discovery and development manifests | Unsupported. |',
    '| `expo start` or `expo export` as Re.Pack commands | Unsupported. |',
    '| Expo Updates, EAS Update and OTA | Unsupported. |',
    '| Re.Pack Module Federation v2 | Supported as explicit application-owned configuration. |',
    '| Expo host -> Expo widget | Supported and validated on iOS and Android. |',
    '| Expo host -> ordinary Re.Pack MF v2 widget | Supported and validated. |',
    '| Ordinary Re.Pack host -> Expo widget | Unsupported; the Expo native contract is not guaranteed. |',
    '| Module Federation v1 or raw `@module-federation/enhanced/rspack` | Unsupported. |',
    '| Metro Module Federation or `@module-federation/metro` | Unsupported. |',
    '| Production MF v2 widget artifacts | Supported as platform-specific remote deployments. |',
    '| Generic remote chunks outside MF v2 | Unsupported by the Expo integration contract. |',
    '| Old Architecture or JSC | Unsupported. |',
    '| Web, SSR, React Server Components and DOM Components | Unsupported. |',
    '| Executable `app.config.*` mutation | Unsupported; static Expo config is required by `init`. |',
  ]) {
    assert.ok(readme.includes(fragment), `README is missing ${fragment}`);
  }
  assert.match(
    readme,
    /do not copy or maintain the generated Swift,\s+Objective-C, Kotlin, Gradle or Xcode snippets by hand/iu
  );
});

test('the Module Federation v2 guide matches the validated host and widget fixtures', () => {
  const hostPackage = readJson(path.join(hostRoot, 'package.json'));
  const widgetPackage = readJson(path.join(widgetRoot, 'package.json'));
  const hostConfig = fs.readFileSync(
    path.join(hostRoot, 'rspack.config.mjs'),
    'utf8'
  );
  const widgetConfig = fs.readFileSync(
    path.join(widgetRoot, 'rspack.config.mjs'),
    'utf8'
  );
  const federationGuide = readReadmeSection(
    '## Module Federation v2',
    '## Public environment variables'
  );

  assert.equal(
    hostPackage.scripts['repack:start'],
    'react-native webpack-start'
  );
  assert.equal(hostPackage.scripts['repack:ios'], 'expo run:ios --no-bundler');
  assert.equal(
    hostPackage.scripts['repack:android'],
    'expo run:android --no-bundler'
  );
  assert.equal(
    widgetPackage.scripts['repack:start:remote'],
    'react-native webpack-start --port 8082'
  );
  assert.equal(
    widgetPackage.scripts['repack:build:production'],
    'pnpm run repack:build:production:ios && pnpm run repack:build:production:android'
  );
  assert.equal(
    widgetPackage.scripts['repack:build:production:ios'],
    'node ./scripts/build-production.mjs ios'
  );
  assert.equal(
    widgetPackage.scripts['repack:build:production:android'],
    'node ./scripts/build-production.mjs android'
  );

  for (const fragment of [
    'new ExpoPlugin({ platform })',
    'Repack.plugins.ModuleFederationPluginV2',
    'npm run repack:start:remote',
    'npm run repack:build:production:ios',
    'npm run repack:build:production:android',
    "loadRemote('ExpoWidget/Widget')",
    'mf-manifest.json',
    'EXPO_PUBLIC_*',
    'CodeSigningPlugin',
  ]) {
    assert.ok(
      federationGuide.includes(fragment),
      `Module Federation guide is missing ${fragment}`
    );
  }

  assert.match(hostConfig, /ModuleFederationPluginV2/);
  assert.match(hostConfig, /ExpoWidget@http:\/\/localhost:8082/);
  assert.doesNotMatch(hostConfig, /extraChunks/);
  assert.match(widgetConfig, /ModuleFederationPluginV2/);
  assert.match(widgetConfig, /'\.\/Widget': '\.\/src\/Widget'/);
  assert.match(widgetConfig, /auxiliaryAssetsPath: remoteOutputPath/);
  assert.match(widgetConfig, /include: \/\.\*\//);
  assert.match(widgetConfig, /type: 'remote'/);
  assert.match(widgetConfig, /outputPath: remoteOutputPath/);

  assert.equal(
    federationGuide.match(/export default \(env\) =>/gu)?.length,
    2,
    'host and widget examples must be complete Rspack configs'
  );

  assert.match(federationGuide, /widget cannot deliver native dependencies/iu);
  assert.match(federationGuide, /host owns Expo Router/iu);
  assert.match(federationGuide, /not Expo Updates or OTA/iu);
  assert.match(federationGuide, /production remotes must use HTTPS/iu);
  assert.match(federationGuide, /same\s+ScriptManager/iu);
  assert.match(federationGuide, /Config Plugin.*native/isu);
  assert.match(federationGuide, /host (?:launch bundle|binary)/iu);
  assert.doesNotMatch(
    federationGuide,
    /\b(?:copy|edit|modify|patch)\b[^.\n]*(?:ios\/|android\/|native)/iu
  );
  assert.doesNotMatch(
    federationGuide,
    /(?:configureScriptManager|globalThis\.ErrorUtils|new ScriptManager|setup\.ts)/u
  );
  assert.doesNotMatch(federationGuide, /second ScriptManager/iu);
  assert.doesNotMatch(federationGuide, /bundle-widget/iu);
});
