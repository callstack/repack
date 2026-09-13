const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  findExpoProjectRoot,
  resolveExpoEntry,
} = require('../dist/rspack/entry/resolveExpoEntry.js');

function createProject(options = {}) {
  const { name = 'fixture' } = options;
  const projectRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'repack-expo-entry-')
  );
  const packageJson = { dependencies: { expo: '56.0.0' }, name };

  if (!Object.hasOwn(options, 'main') || options.main !== undefined) {
    packageJson.main = options.main ?? 'index.js';
  }

  fs.writeFileSync(
    path.join(projectRoot, 'package.json'),
    JSON.stringify(packageJson)
  );
  return projectRoot;
}

test('resolves a plain package.json main entry', () => {
  const projectRoot = createProject();
  fs.writeFileSync(path.join(projectRoot, 'index.js'), 'module.exports = {};');

  const result = resolveExpoEntry({ platform: 'ios', projectRoot });

  assert.equal(result.projectRoot, projectRoot);
  assert.equal(result.physicalProjectRoot, fs.realpathSync(projectRoot));
  assert.equal(
    result.entryPath,
    fs.realpathSync(path.join(projectRoot, 'index.js'))
  );
  assert.equal(result.request, 'index.js');
  assert.equal(result.packageName, 'fixture');
  assert.equal(result.platform, 'ios');
  assert.equal(Object.isFrozen(result), true);
});

test('uses native platform extension precedence for project files', () => {
  const projectRoot = createProject({ main: './index' });
  fs.writeFileSync(path.join(projectRoot, 'index.native.tsx'), '');
  fs.writeFileSync(path.join(projectRoot, 'index.ios.tsx'), '');
  fs.writeFileSync(path.join(projectRoot, 'index.tsx'), '');

  assert.equal(
    resolveExpoEntry({ platform: 'ios', projectRoot }).entryPath,
    fs.realpathSync(path.join(projectRoot, 'index.ios.tsx'))
  );
  assert.equal(
    resolveExpoEntry({ platform: 'android', projectRoot }).entryPath,
    fs.realpathSync(path.join(projectRoot, 'index.native.tsx'))
  );
});

test('allows an explicit entry override without changing package.json', () => {
  const projectRoot = createProject({ main: 'index.js' });
  fs.writeFileSync(path.join(projectRoot, 'custom.android.ts'), '');

  const result = resolveExpoEntry({
    entry: './custom',
    platform: 'android',
    projectRoot,
  });

  assert.equal(result.request, './custom');
  assert.equal(
    result.entryPath,
    fs.realpathSync(path.join(projectRoot, 'custom.android.ts'))
  );
});

test('resolves the Expo Router package entry', () => {
  const projectRoot = createProject({ main: 'expo-router/entry' });
  const routerRoot = path.join(projectRoot, 'node_modules', 'expo-router');
  fs.mkdirSync(routerRoot, { recursive: true });
  fs.writeFileSync(
    path.join(routerRoot, 'package.json'),
    JSON.stringify({
      exports: { './entry': './entry.js' },
      name: 'expo-router',
    })
  );
  fs.writeFileSync(path.join(routerRoot, 'entry.js'), 'module.exports = {};');

  const result = resolveExpoEntry({ platform: 'android', projectRoot });

  assert.equal(result.request, 'expo-router/entry');
  assert.equal(
    result.entryPath,
    fs.realpathSync(path.join(routerRoot, 'entry.js'))
  );
});

test('discovers the nearest Expo project from a nested source path', () => {
  const projectRoot = createProject();
  const nestedFile = path.join(projectRoot, 'src', 'features', 'screen.tsx');
  fs.mkdirSync(path.dirname(nestedFile), { recursive: true });
  fs.writeFileSync(nestedFile, '');

  assert.equal(findExpoProjectRoot(nestedFile), projectRoot);
});

test('preserves the logical monorepo symlink root', (context) => {
  if (process.platform === 'win32') {
    context.skip('Directory symlink permissions vary on Windows.');
    return;
  }

  const physicalRoot = createProject();
  fs.writeFileSync(path.join(physicalRoot, 'index.js'), '');
  const workspaceRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'repack-expo-workspace-')
  );
  const logicalRoot = path.join(workspaceRoot, 'apps', 'fixture');
  fs.mkdirSync(path.dirname(logicalRoot), { recursive: true });
  fs.symlinkSync(physicalRoot, logicalRoot, 'dir');

  const result = resolveExpoEntry({
    platform: 'ios',
    projectRoot: logicalRoot,
  });

  assert.equal(result.projectRoot, logicalRoot);
  assert.equal(result.physicalProjectRoot, fs.realpathSync(physicalRoot));
  assert.equal(
    result.entryPath,
    fs.realpathSync(path.join(physicalRoot, 'index.js'))
  );
});

test('rejects an Expo Metro virtual entry with recovery guidance', () => {
  const projectRoot = createProject({ main: '.expo/.virtual-metro-entry' });

  assert.throws(
    () => resolveExpoEntry({ platform: 'ios', projectRoot }),
    (error) => {
      assert.equal(error.code, 'METRO_ENTRY_UNSUPPORTED');
      assert.equal(error.projectRoot, projectRoot);
      assert.equal(error.requestedEntry, '.expo/.virtual-metro-entry');
      assert.match(error.recovery, /package\.json#main/);
      return true;
    }
  );
});

test('reports an unresolvable entry with platform and recovery guidance', () => {
  const projectRoot = createProject({ main: 'missing-entry' });

  assert.throws(
    () => resolveExpoEntry({ platform: 'android', projectRoot }),
    (error) => {
      assert.equal(error.code, 'ENTRY_NOT_FOUND');
      assert.equal(error.platform, 'android');
      assert.equal(error.projectRoot, projectRoot);
      assert.equal(error.requestedEntry, 'missing-entry');
      assert.match(error.message, /missing-entry/);
      assert.match(error.recovery, /package\.json#main/);
      return true;
    }
  );
});

test('requires package.json main', () => {
  const projectRoot = createProject({ main: undefined });

  assert.throws(
    () => resolveExpoEntry({ platform: 'ios', projectRoot }),
    (error) => {
      assert.equal(error.code, 'ENTRY_NOT_DEFINED');
      assert.match(error.recovery, /expo-router\/entry/);
      return true;
    }
  );
});

test('rejects an explicit non-Expo package root', () => {
  const projectRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'repack-non-expo-entry-')
  );
  fs.writeFileSync(
    path.join(projectRoot, 'package.json'),
    JSON.stringify({ main: 'index.js', name: 'not-expo' })
  );
  fs.writeFileSync(path.join(projectRoot, 'index.js'), '');

  assert.throws(
    () => resolveExpoEntry({ platform: 'ios', projectRoot }),
    (error) => {
      assert.equal(error.code, 'EXPO_PROJECT_NOT_FOUND');
      assert.match(error.recovery, /Install expo/);
      return true;
    }
  );
});

test('reports malformed package.json before resolving an entry', () => {
  const projectRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'repack-invalid-package-')
  );
  fs.writeFileSync(path.join(projectRoot, 'package.json'), '[]');

  assert.throws(
    () => resolveExpoEntry({ platform: 'ios', projectRoot }),
    (error) => {
      assert.equal(error.code, 'INVALID_PACKAGE_JSON');
      assert.match(error.recovery, /Fix package\.json/);
      return true;
    }
  );
});

test('rejects unsupported platforms before reading project files', () => {
  assert.throws(
    () => resolveExpoEntry({ platform: 'web', projectRoot: '/missing' }),
    (error) => {
      assert.equal(error.code, 'UNSUPPORTED_PLATFORM');
      assert.match(error.recovery, /ios or android/);
      return true;
    }
  );
});
