const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const packageRoot = path.resolve(__dirname, '..');
const packageJson = require('../package.json');

test('keeps the integration package private during development', () => {
  assert.equal(packageJson.name, '@callstack/repack-expo');
  assert.equal(packageJson.version, '0.0.0');
  assert.equal(packageJson.private, true);
});

test('keeps federation opt-in and owned by the application', () => {
  const packageDependencies = {
    ...packageJson.dependencies,
    ...packageJson.peerDependencies,
  };

  assert.equal('@module-federation/enhanced' in packageDependencies, false);
  assert.equal('@module-federation/metro' in packageDependencies, false);
});

test('loads the default CommonJS Config Plugin and registers native mods once', () => {
  const withRepackExpo = require(packageRoot);
  const config = {
    name: 'fixture',
    slug: 'fixture',
    updates: { enabled: false },
  };

  assert.equal(typeof withRepackExpo, 'function');
  const configured = withRepackExpo(config);
  assert.deepEqual(Object.keys(configured.mods).sort(), ['android', 'ios']);
  assert.equal(
    configured._internal.pluginHistory['@callstack/repack-expo'].version,
    '0.0.0'
  );
  assert.equal(withRepackExpo(configured), configured);
});

test('keeps the Rspack subpath isolated from the Config Plugin', () => {
  const configPluginEntry = path.join(packageRoot, 'dist', 'index.js');
  const script = [
    "require('@callstack/repack-expo/rspack');",
    `const loaded = Boolean(require.cache[${JSON.stringify(configPluginEntry)}]);`,
    'if (loaded) process.exit(2);',
  ].join('');
  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: packageRoot,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
});

test('rejects unknown CLI commands without writing to the project', () => {
  const projectRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'repack-expo-unknown-')
  );
  const result = spawnSync(
    process.execPath,
    [path.join(packageRoot, packageJson.bin['repack-expo']), 'start'],
    { cwd: projectRoot, encoding: 'utf8' }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Usage: repack-expo <init\|doctor>/);
  assert.deepEqual(fs.readdirSync(projectRoot), []);
});

test('contains no native module or Expo autolinking descriptor', () => {
  const forbiddenExtensions = new Set([
    '.h',
    '.java',
    '.kt',
    '.m',
    '.mm',
    '.swift',
  ]);
  const pending = [packageRoot];

  while (pending.length > 0) {
    const directory = pending.pop();
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        pending.push(entryPath);
        continue;
      }

      assert.equal(forbiddenExtensions.has(path.extname(entry.name)), false);
      assert.notEqual(entry.name, 'expo-module.config.json');
    }
  }
});

test('packs only the declared distribution artifacts', () => {
  const npmCache = fs.mkdtempSync(
    path.join(os.tmpdir(), 'repack-expo-npm-cache-')
  );
  const result = spawnSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: packageRoot,
    encoding: 'utf8',
    env: { ...process.env, npm_config_cache: npmCache },
  });

  assert.equal(result.status, 0, result.stderr);
  const [{ files }] = JSON.parse(result.stdout);
  const packedPaths = files.map((file) => file.path);

  assert.ok(packedPaths.includes('package.json'));
  assert.ok(packedPaths.includes('README.md'));
  assert.ok(packedPaths.includes('dist/index.js'));
  assert.ok(packedPaths.includes('dist/rspack/index.js'));
  assert.ok(packedPaths.includes('dist/rspack/loaders/expoBabelLoader.js'));
  assert.ok(
    packedPaths.includes('dist/rspack/loaders/expoRouterEntryLoader.js')
  );
  assert.ok(packedPaths.includes('dist/cli/bin.js'));
  assert.ok(packedPaths.includes('dist/cli/commands.js'));
  assert.ok(packedPaths.includes('dist/cli/doctor.js'));
  assert.ok(packedPaths.includes('dist/cli/init.js'));
  assert.ok(packedPaths.includes('dist/cli/project.js'));
  assert.equal(
    packedPaths.some((file) => file.startsWith('src/')),
    false
  );
  assert.equal(
    packedPaths.some((file) => file.startsWith('test/')),
    false
  );
  assert.equal(
    packedPaths.some((file) => file.endsWith('.ts') && !file.endsWith('.d.ts')),
    false
  );
});
