const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const {
  detectPackageManager,
  runDoctor,
  runInit,
} = require('../dist/cli/commands.js');
const { createProject } = require('./helpers/createCliProject.cjs');

test('init configures a clean static Expo app without touching native directories', () => {
  const projectRoot = createProject({ lockfile: 'pnpm-lock.yaml' });

  const result = runInit({ projectRoot });

  assert.equal(result.ok, true);
  assert.deepEqual(result.changedFiles.sort(), [
    'app.json',
    'package.json',
    'react-native.config.js',
    'rspack.config.mjs',
  ]);
  const appConfig = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'app.json'), 'utf8')
  ).expo;
  assert.equal('newArchEnabled' in appConfig, false);
  assert.equal('jsEngine' in appConfig, false);
  assert.deepEqual(appConfig.updates, { enabled: false });
  assert.ok(appConfig.plugins.includes('@callstack/repack-expo'));
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
  );
  assert.equal(
    Object.values(packageJson.devDependencies).some((range) => range === '*'),
    false
  );
  assert.match(
    fs.readFileSync(path.join(projectRoot, 'rspack.config.mjs'), 'utf8'),
    /new ExpoPlugin\(\{ entry, platform \}\)/
  );
  assert.equal(fs.existsSync(path.join(projectRoot, 'ios')), false);
  assert.equal(fs.existsSync(path.join(projectRoot, 'android')), false);
  assert.equal(result.packageManager, 'pnpm');
});

test('generated Rspack configs forward the CLI entry to ExpoPlugin', () => {
  for (const configName of ['rspack.config.mjs', 'rspack.config.cjs']) {
    const projectRoot = createProject();
    const configPath = path.join(projectRoot, configName);
    if (configName.endsWith('.cjs')) {
      fs.writeFileSync(configPath, 'module.exports = {};\n');
    }

    const result = runInit({
      force: configName.endsWith('.cjs'),
      projectRoot,
    });
    const contents = fs.readFileSync(configPath, 'utf8');

    assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
    assert.match(contents, /const \{ entry, mode = 'development'/);
    assert.match(contents, /new ExpoPlugin\(\{ entry, platform \}\)/);
  }
});

function snapshotTree(projectRoot) {
  const snapshot = new Map();
  const pending = [''];
  while (pending.length > 0) {
    const relativeDirectory = pending.pop();
    for (const entry of fs.readdirSync(
      path.join(projectRoot, relativeDirectory),
      {
        withFileTypes: true,
      }
    )) {
      const relativePath = path.join(relativeDirectory, entry.name);
      if (entry.isDirectory()) pending.push(relativePath);
      else
        snapshot.set(
          relativePath,
          fs.readFileSync(path.join(projectRoot, relativePath))
        );
    }
  }
  return snapshot;
}

function writeRspackConfig(
  projectRoot,
  { federationImport, federationPlugin }
) {
  fs.writeFileSync(
    path.join(projectRoot, 'rspack.config.mjs'),
    [
      "import { ExpoPlugin } from '@callstack/repack-expo/rspack';",
      federationImport,
      "throw new Error('doctor must not execute application config');",
      'export default {',
      `  plugins: [new ExpoPlugin(), ${federationPlugin}],`,
      '};',
    ].join('\n')
  );
}

test('doctor is read-only and reports unsupported Expo Updates with a stable code', () => {
  const projectRoot = createProject();
  assert.equal(runInit({ projectRoot }).ok, true);
  const validBefore = snapshotTree(projectRoot);

  const valid = runDoctor({ projectRoot });

  assert.equal(valid.ok, true, JSON.stringify(valid.diagnostics));
  assert.deepEqual(snapshotTree(projectRoot), validBefore);

  const appPath = path.join(projectRoot, 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appPath, 'utf8'));
  appJson.expo.updates.enabled = true;
  fs.writeFileSync(appPath, `${JSON.stringify(appJson, null, 2)}\n`);
  const brokenBefore = snapshotTree(projectRoot);

  const broken = runDoctor({ projectRoot });

  assert.equal(broken.ok, false);
  assert.equal(broken.diagnostics[0].code, 'EXPO_UPDATES_ACTIVE');
  assert.match(broken.diagnostics[0].recovery, /enabled.*false/i);
  assert.deepEqual(snapshotTree(projectRoot), brokenBefore);
});

test('init is idempotent and check/dry-run never write', () => {
  const projectRoot = createProject();
  assert.equal(runInit({ projectRoot }).ok, true);
  const initialized = snapshotTree(projectRoot);

  assert.deepEqual(runInit({ projectRoot }).changedFiles, []);
  assert.deepEqual(snapshotTree(projectRoot), initialized);

  fs.rmSync(path.join(projectRoot, 'rspack.config.mjs'));
  const beforeCheck = snapshotTree(projectRoot);
  const check = runInit({ check: true, projectRoot });
  assert.equal(check.ok, false);
  assert.deepEqual(check.changedFiles, ['rspack.config.mjs']);
  assert.deepEqual(snapshotTree(projectRoot), beforeCheck);

  const dryRun = runInit({ dryRun: true, projectRoot });
  assert.equal(dryRun.ok, true);
  assert.deepEqual(dryRun.changedFiles, ['rspack.config.mjs']);
  assert.equal(dryRun.changes[0].before, null);
  assert.match(dryRun.changes[0].after, /new ExpoPlugin/);
  assert.deepEqual(snapshotTree(projectRoot), beforeCheck);
});

test('preserves public Module Federation v2 config and doctor validates it statically', () => {
  const projectRoot = createProject();
  assert.equal(runInit({ projectRoot }).ok, true);
  writeRspackConfig(projectRoot, {
    federationImport: [
      "import * as Repack from '@callstack/repack';",
      "// new Repack.plugins.ModuleFederationPluginV1({ name: 'old-config' });",
    ].join('\n'),
    federationPlugin:
      "new Repack.plugins.ModuleFederationPluginV2({ name: 'Host' })",
  });
  const before = snapshotTree(projectRoot);

  const initialized = runInit({ projectRoot });
  const doctor = runDoctor({ projectRoot });

  assert.equal(initialized.ok, true, JSON.stringify(initialized.diagnostics));
  assert.deepEqual(initialized.changedFiles, []);
  assert.deepEqual(snapshotTree(projectRoot), before);
  assert.equal(doctor.ok, true, JSON.stringify(doctor.diagnostics));
});

test('detects an aliased Module Federation v2 plugin', () => {
  const projectRoot = createProject();
  assert.equal(runInit({ projectRoot }).ok, true);
  writeRspackConfig(projectRoot, {
    federationImport:
      "import { ModuleFederationPluginV2 as ModuleFederationPlugin } from '@callstack/repack';",
    federationPlugin: "new ModuleFederationPlugin({ name: 'Host' })",
  });

  const result = runDoctor({ projectRoot });

  assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
});

test('doctor rejects unsupported active federation shapes with stable diagnostics', () => {
  const cases = [
    {
      code: 'MODULE_FEDERATION_V1_UNSUPPORTED',
      federationImport: "import * as Repack from '@callstack/repack';",
      federationPlugin:
        "new Repack.plugins.ModuleFederationPluginV1({ name: 'Widget' })",
    },
    {
      code: 'MODULE_FEDERATION_V1_UNSUPPORTED',
      federationImport: "import * as Repack from '@callstack/repack';",
      federationPlugin:
        "new Repack.plugins.ModuleFederationPlugin({ name: 'Widget' })",
    },
    {
      code: 'MODULE_FEDERATION_V1_UNSUPPORTED',
      federationImport:
        "import { ModuleFederationPluginV1 as LegacyFederationPlugin } from '@callstack/repack';",
      federationPlugin: "new LegacyFederationPlugin({ name: 'Widget' })",
    },
    {
      code: 'MODULE_FEDERATION_V1_UNSUPPORTED',
      federationImport: [
        "import * as Repack from '@callstack/repack';",
        'const { ModuleFederationPlugin: LegacyFederationPlugin } = Repack.plugins;',
      ].join('\n'),
      federationPlugin: "new LegacyFederationPlugin({ name: 'Widget' })",
    },
    {
      code: 'MODULE_FEDERATION_RAW_PLUGIN_UNSUPPORTED',
      federationImport:
        "import { ModuleFederationPlugin as RawFederationPlugin } from '@module-federation/enhanced/rspack';",
      federationPlugin: "new RawFederationPlugin({ name: 'Widget' })",
    },
  ];

  for (const testCase of cases) {
    const projectRoot = createProject();
    assert.equal(runInit({ projectRoot }).ok, true);
    writeRspackConfig(projectRoot, testCase);
    const before = snapshotTree(projectRoot);

    const result = runDoctor({ projectRoot });
    const federationDiagnostics = result.diagnostics.filter(({ code }) =>
      code.startsWith('MODULE_FEDERATION_')
    );

    assert.equal(result.ok, false);
    assert.deepEqual(
      federationDiagnostics.map(({ code }) => code),
      [testCase.code]
    );
    assert.match(federationDiagnostics[0].recovery, /ModuleFederationPluginV2/);
    assert.deepEqual(snapshotTree(projectRoot), before);
  }
});

test('doctor ignores unused Metro federation configuration and dependency', () => {
  const projectRoot = createProject({
    dependencies: { '@module-federation/metro': '2.8.0' },
  });
  assert.equal(runInit({ projectRoot }).ok, true);
  fs.writeFileSync(
    path.join(projectRoot, 'metro.config.js'),
    "module.exports = require('@module-federation/metro');\n"
  );

  const result = runDoctor({ projectRoot });

  assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
});

test('init rolls back earlier file replacements when a transaction fails', () => {
  const projectRoot = createProject();
  assert.equal(runInit({ projectRoot }).ok, true);
  const packagePath = path.join(projectRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  delete packageJson.scripts['repack:start'];
  fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
  const appPath = path.join(projectRoot, 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appPath, 'utf8'));
  appJson.expo.description = 'rollback fixture';
  fs.writeFileSync(appPath, `${JSON.stringify(appJson, null, 2)}\n`);
  fs.rmSync(path.join(projectRoot, 'react-native.config.js'));
  fs.rmSync(path.join(projectRoot, 'rspack.config.mjs'));
  const before = snapshotTree(projectRoot);
  const originalRename = fs.renameSync;
  let installed = 0;
  fs.renameSync = (source, destination) => {
    if (String(source).endsWith('.tmp') && ++installed === 2) {
      throw new Error('injected rename failure');
    }
    return originalRename(source, destination);
  };

  try {
    assert.throws(() => runInit({ projectRoot }), /injected rename failure/);
  } finally {
    fs.renameSync = originalRename;
  }

  assert.deepEqual(snapshotTree(projectRoot), before);
});

test('detects supported package managers without executing them', () => {
  for (const [lockfile, expected, install] of [
    ['package-lock.json', 'npm', 'npm install'],
    ['yarn.lock', 'yarn', 'yarn install'],
    ['pnpm-lock.yaml', 'pnpm', 'pnpm install'],
    ['bun.lock', 'bun', 'bun install'],
  ]) {
    const projectRoot = createProject({ lockfile });
    assert.equal(detectPackageManager(projectRoot), expected);
    assert.equal(
      runInit({ dryRun: true, projectRoot }).installCommand,
      install
    );
  }
});

test('detects package manager metadata at the workspace root', () => {
  const workspaceRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'repack-expo-workspace-')
  );
  fs.writeFileSync(
    path.join(workspaceRoot, 'package.json'),
    '{"private":true,"packageManager":"yarn@4.9.2"}\n'
  );
  fs.writeFileSync(path.join(workspaceRoot, 'yarn.lock'), '');
  const projectRoot = path.join(workspaceRoot, 'apps', 'fixture');
  fs.mkdirSync(projectRoot, { recursive: true });

  assert.equal(detectPackageManager(projectRoot), 'yarn');
});

test('stops package manager detection at a package.json workspace root', () => {
  const parentRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'repack-expo-parent-workspace-')
  );
  fs.writeFileSync(path.join(parentRoot, 'yarn.lock'), '');
  const workspaceRoot = path.join(parentRoot, 'workspace');
  fs.mkdirSync(workspaceRoot);
  fs.writeFileSync(
    path.join(workspaceRoot, 'package.json'),
    '{"private":true,"workspaces":["apps/*"]}\n'
  );
  const projectRoot = path.join(workspaceRoot, 'apps', 'fixture');
  fs.mkdirSync(projectRoot, { recursive: true });

  assert.equal(detectPackageManager(projectRoot), 'npm');
});

test('requires force before replacing an incompatible Rspack config', () => {
  const projectRoot = createProject();
  const rspackPath = path.join(projectRoot, 'rspack.config.mjs');
  fs.writeFileSync(rspackPath, 'export default { custom: true };\n');
  const before = snapshotTree(projectRoot);

  const refused = runInit({ projectRoot });
  assert.equal(refused.ok, false);
  assert.equal(refused.diagnostics[0].code, 'RSPACK_CONFIG_CONFLICT');
  assert.deepEqual(snapshotTree(projectRoot), before);

  const forced = runInit({ force: true, projectRoot });
  assert.equal(forced.ok, true);
  assert.match(fs.readFileSync(rspackPath, 'utf8'), /new ExpoPlugin/);
});

test('does not treat a commented ExpoPlugin constructor as compatible', () => {
  const projectRoot = createProject();
  const rspackPath = path.join(projectRoot, 'rspack.config.mjs');
  fs.writeFileSync(
    rspackPath,
    [
      "import { ExpoPlugin } from '@callstack/repack-expo/rspack';",
      '// new ExpoPlugin();',
      'export default {};',
    ].join('\n')
  );

  const result = runInit({ projectRoot });

  assert.equal(result.ok, false);
  assert.equal(result.diagnostics[0].code, 'RSPACK_CONFIG_CONFLICT');
});

test('does not treat a commented RepackPlugin constructor as active', () => {
  const projectRoot = createProject();
  const rspackPath = path.join(projectRoot, 'rspack.config.mjs');
  fs.writeFileSync(
    rspackPath,
    [
      "import { ExpoPlugin } from '@callstack/repack-expo/rspack';",
      '// new RepackPlugin();',
      "export default { plugins: [new ExpoPlugin({ platform: 'ios' })] };",
    ].join('\n')
  );

  const result = runInit({ projectRoot });

  assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
});

test('force replaces the single discovered Rspack config without shadowing it', () => {
  for (const configName of ['rspack.config.ts', 'rspack.config.cjs']) {
    const projectRoot = createProject();
    const rspackPath = path.join(projectRoot, configName);
    fs.writeFileSync(rspackPath, 'module.exports = { custom: true };\n');
    const before = snapshotTree(projectRoot);

    const result = runInit({ force: true, projectRoot });

    assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
    assert.notDeepEqual(snapshotTree(projectRoot), before);
    assert.match(fs.readFileSync(rspackPath, 'utf8'), /new ExpoPlugin/);
    if (configName.endsWith('.cjs')) {
      assert.match(fs.readFileSync(rspackPath, 'utf8'), /module\.exports/);
    }
    assert.equal(
      fs.existsSync(path.join(projectRoot, 'rspack.config.mjs')),
      false
    );
  }
});

test('CLI emits JSON and maps check/doctor errors to a nonzero status without writes', () => {
  const projectRoot = createProject();
  const cli = path.resolve(__dirname, '../dist/cli/bin.js');
  const before = snapshotTree(projectRoot);
  const check = spawnSync(
    process.execPath,
    [cli, 'init', '--check', '--json'],
    {
      cwd: projectRoot,
      encoding: 'utf8',
    }
  );

  assert.equal(check.status, 1);
  assert.deepEqual(JSON.parse(check.stdout).changedFiles.sort(), [
    'app.json',
    'package.json',
    'react-native.config.js',
    'rspack.config.mjs',
  ]);
  assert.equal(check.stderr, '');
  assert.deepEqual(snapshotTree(projectRoot), before);

  const doctor = spawnSync(process.execPath, [cli, 'doctor', '--json'], {
    cwd: projectRoot,
    encoding: 'utf8',
  });
  assert.equal(doctor.status, 1);
  assert.ok(JSON.parse(doctor.stdout).errorCount > 0);
  assert.equal(doctor.stderr, '');
  assert.deepEqual(snapshotTree(projectRoot), before);
});

test('init refuses ambiguous or conflicting user configuration atomically', () => {
  const dynamicRoot = createProject();
  fs.writeFileSync(
    path.join(dynamicRoot, 'app.config.js'),
    'module.exports = ({ config }) => config;\n'
  );
  const dynamicBefore = snapshotTree(dynamicRoot);
  const dynamic = runInit({ force: true, projectRoot: dynamicRoot });
  assert.equal(dynamic.ok, false);
  assert.equal(dynamic.diagnostics[0].code, 'DYNAMIC_EXPO_CONFIG');
  assert.deepEqual(snapshotTree(dynamicRoot), dynamicBefore);

  const conflictRoot = createProject({
    expo: {
      updates: { checkAutomatically: 'ON_LOAD', enabled: true },
    },
  });
  const conflictBefore = snapshotTree(conflictRoot);
  const conflict = runInit({ projectRoot: conflictRoot });
  assert.equal(conflict.ok, false);
  assert.ok(
    conflict.diagnostics.some(({ code }) => code === 'EXPO_UPDATES_CONFLICT')
  );
  assert.deepEqual(snapshotTree(conflictRoot), conflictBefore);
});

test('init preserves additional disabled Updates configuration', () => {
  const projectRoot = createProject({
    expo: {
      updates: { checkAutomatically: 'ON_ERROR_RECOVERY', enabled: false },
    },
  });
  assert.equal(runInit({ projectRoot }).ok, true);
  const updates = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'app.json'), 'utf8')
  ).expo.updates;
  assert.deepEqual(updates, {
    checkAutomatically: 'ON_ERROR_RECOVERY',
    enabled: false,
  });
});

test('init removes redundant supported Expo runtime defaults from app config', () => {
  const projectRoot = createProject({
    expo: { jsEngine: 'hermes', newArchEnabled: true },
  });

  const result = runInit({ projectRoot });
  const expo = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'app.json'), 'utf8')
  ).expo;

  assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
  assert.equal('newArchEnabled' in expo, false);
  assert.equal('jsEngine' in expo, false);
});

test('init rejects explicit supported Expo runtime opt-outs without writing', () => {
  const projectRoot = createProject({
    expo: { jsEngine: 'jsc', newArchEnabled: false },
  });
  const before = snapshotTree(projectRoot);

  const result = runInit({ projectRoot });
  const codes = result.diagnostics.map(({ code }) => code);

  assert.equal(result.ok, false);
  assert.ok(codes.includes('EXPO_NEW_ARCH_CONFLICT'));
  assert.ok(codes.includes('EXPO_JS_ENGINE_CONFLICT'));
  assert.deepEqual(snapshotTree(projectRoot), before);
});

test('doctor detects stale generated native runtime settings without writing', () => {
  const projectRoot = createProject();
  assert.equal(runInit({ projectRoot }).ok, true);
  fs.mkdirSync(path.join(projectRoot, 'ios', 'Fixture', 'Supporting'), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(projectRoot, 'ios', 'Fixture', 'AppDelegate.swift'),
    '// repack-expo-ios-bundle-url\n'
  );
  fs.writeFileSync(
    path.join(projectRoot, 'ios', 'project.pbxproj'),
    '// repack-expo-ios-bundle-command\n'
  );
  fs.writeFileSync(
    path.join(projectRoot, 'ios', 'Fixture', 'Supporting', 'Expo.plist'),
    '<key>EXUpdatesEnabled</key><true/>\n'
  );
  fs.writeFileSync(
    path.join(projectRoot, 'ios', 'Podfile.properties.json'),
    '{"expo.jsEngine":"jsc"}\n'
  );
  fs.mkdirSync(path.join(projectRoot, 'android', 'app'), { recursive: true });
  fs.writeFileSync(
    path.join(projectRoot, 'android', 'app', 'build.gradle'),
    '// repack-expo-android-bundle-command\n'
  );
  fs.writeFileSync(
    path.join(projectRoot, 'android', 'app', 'MainApplication.kt'),
    '// repack-expo-android-main-module\n'
  );
  fs.writeFileSync(
    path.join(projectRoot, 'android', 'app', 'AndroidManifest.xml'),
    '<meta-data android:name="expo.modules.updates.ENABLED" android:value="true"/>\n'
  );
  fs.writeFileSync(
    path.join(projectRoot, 'android', 'gradle.properties'),
    'newArchEnabled=false\nhermesEnabled=false\n'
  );
  const before = snapshotTree(projectRoot);

  const result = runDoctor({ projectRoot });
  const codes = result.diagnostics.map(({ code }) => code);
  assert.ok(codes.includes('NATIVE_UPDATES_ACTIVE'));
  assert.ok(codes.includes('NATIVE_HERMES_MISMATCH'));
  assert.ok(codes.includes('NATIVE_NEW_ARCH_MISMATCH'));
  assert.ok(codes.includes('IOS_NATIVE_SEAMS_MISSING'));
  assert.ok(codes.includes('ANDROID_NATIVE_SEAMS_MISSING'));
  assert.ok(codes.includes('SCRIPTMANAGER_AUTOLINK_UNVERIFIED'));
  assert.deepEqual(snapshotTree(projectRoot), before);
});

test('doctor resolves a plain local package.json main entry', () => {
  const projectRoot = createProject();
  const packagePath = path.join(projectRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  packageJson.main = 'index.js';
  fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
  assert.equal(runInit({ projectRoot }).ok, true);

  const missing = runDoctor({ projectRoot });
  assert.ok(
    missing.diagnostics.some(({ code }) => code === 'ENTRY_UNRESOLVED')
  );

  fs.writeFileSync(path.join(projectRoot, 'index.js'), 'export {};\n');
  const present = runDoctor({ projectRoot });
  assert.equal(
    present.diagnostics.some(({ code }) => code === 'ENTRY_UNRESOLVED'),
    false
  );
});

test('doctor uses the shared entry resolver for both native platforms', () => {
  const projectRoot = createProject();
  const packagePath = path.join(projectRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  packageJson.main = 'src/main';
  fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
  fs.mkdirSync(path.join(projectRoot, 'src'));
  fs.writeFileSync(
    path.join(projectRoot, 'src', 'main.ios.ts'),
    'export {};\n'
  );
  fs.writeFileSync(
    path.join(projectRoot, 'src', 'main.android.ts'),
    'export {};\n'
  );
  assert.equal(runInit({ projectRoot }).ok, true);

  const result = runDoctor({ projectRoot });

  assert.equal(
    result.diagnostics.some(({ code }) => code === 'ENTRY_UNRESOLVED'),
    false,
    JSON.stringify(result.diagnostics)
  );
});

test('doctor does not invent a default entry when package.json main is absent', () => {
  const projectRoot = createProject();
  const packagePath = path.join(projectRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  delete packageJson.main;
  fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
  assert.equal(runInit({ projectRoot }).ok, true);

  const result = runDoctor({ projectRoot });

  assert.ok(
    result.diagnostics.some(
      ({ code, message }) =>
        code === 'ENTRY_UNRESOLVED' &&
        /does not define package\.json#main/.test(message)
    )
  );
});

test('tuple Config Plugin options drive entry and config paths', () => {
  const projectRoot = createProject({
    expo: {
      plugins: [
        [
          '@callstack/repack-expo',
          { configPath: 'config/rspack.native.mjs', entry: 'src/main' },
        ],
      ],
    },
  });
  fs.mkdirSync(path.join(projectRoot, 'src'));
  fs.writeFileSync(path.join(projectRoot, 'src', 'main.ts'), 'export {};\n');

  const initialized = runInit({ projectRoot });

  assert.equal(initialized.ok, true, JSON.stringify(initialized.diagnostics));
  assert.ok(initialized.changedFiles.includes('config/rspack.native.mjs'));
  assert.equal(
    fs.existsSync(path.join(projectRoot, 'rspack.config.mjs')),
    false
  );
  assert.equal(
    runDoctor({ projectRoot }).diagnostics.some(
      ({ code }) =>
        code === 'ENTRY_UNRESOLVED' || code === 'RSPACK_CONFIG_MISSING'
    ),
    false
  );
});

test('validates package.json#expo shape and keeps caught JSON output machine-readable', () => {
  const projectRoot = createProject();
  fs.rmSync(path.join(projectRoot, 'app.json'));
  const packagePath = path.join(projectRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  packageJson.expo = 'invalid';
  fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

  const result = runInit({ projectRoot });
  assert.equal(result.ok, false);
  assert.ok(
    result.diagnostics.some(({ code }) => code === 'EXPO_CONFIG_INVALID')
  );

  const cli = path.resolve(__dirname, '../dist/cli/bin.js');
  const caught = spawnSync(process.execPath, [cli, 'unknown', '--json'], {
    cwd: projectRoot,
    encoding: 'utf8',
  });
  assert.equal(caught.status, 1);
  assert.equal(caught.stderr, '');
  assert.equal(JSON.parse(caught.stdout).diagnostics[0].code, 'CLI_ERROR');
});
