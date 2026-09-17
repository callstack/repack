const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { runBuild } = require('../dist/cli/build.js');
const { parseExpoCommand } = require('../dist/cli/commands.js');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'expo release '));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  function file(relative, contents = '') {
    const absolute = path.join(root, relative);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, contents);
    return absolute;
  }
  file('android/gradlew');
  file('ios/Example.xcworkspace/contents.xcworkspacedata');
  file('ios/Pods/Manifest.lock');
  file('node_modules/expo/bin/cli');
  return { root, file };
}

test('build parsing accepts platforms and restricts platform-specific options', () => {
  assert.deepEqual(
    parseExpoCommand([
      'build',
      '--platform',
      'ios',
      '--run',
      '--scheme',
      'Custom',
      '--device',
      'device-id',
    ]),
    {
      command: 'build',
      platform: 'ios',
      run: true,
      scheme: 'Custom',
      device: 'device-id',
    }
  );
  assert.equal(parseExpoCommand(['build', '--platform', 'android']).run, false);
  for (const args of [
    [],
    ['--platform', 'web'],
    ['--platform', 'android', '--scheme', 'X'],
    ['--platform', 'ios', '--device', 'id'],
    ['--platform', 'ios', '--force'],
    ['--platform', 'ios', 'extra'],
  ]) {
    assert.throws(() => parseExpoCommand(['build', ...args]));
  }
});

test('only the Expo host exposes standalone Release aliases', () => {
  for (const app of ['tester-expo', 'tester-expo-widget']) {
    const { scripts } = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, '../../../apps', app, 'package.json'),
        'utf8'
      )
    );
    for (const platform of ['android', 'ios']) {
      assert.equal(
        scripts[`repack:release:${platform}`],
        app === 'tester-expo'
          ? `repack-expo build --platform ${platform}`
          : undefined
      );
    }
  }
});

test('Android build alone does not invoke Expo or install an application', (t) => {
  const { root, file } = fixture(t);
  const calls = [];
  const binary = runBuild(
    { projectRoot: root, platform: 'android', run: false },
    (command, args) => {
      calls.push({ command, args });
      file('android/app/build/outputs/apk/release/app-release.apk');
      return { status: 0 };
    }
  );
  assert.deepEqual(calls, [
    {
      command: path.join(root, 'android/gradlew'),
      args: [':app:assembleRelease'],
    },
  ]);
  assert.equal(
    binary,
    path.join(root, 'android/app/build/outputs/apk/release/app-release.apk')
  );
});

test('Android --run installs only the newly built binary without a bundler', (t) => {
  const { root, file } = fixture(t);
  const calls = [];
  const binary = runBuild(
    {
      projectRoot: root,
      platform: 'android',
      run: true,
      device: 'Pixel_Test',
    },
    (command, args, options) => {
      calls.push({ command, args, cwd: options.cwd });
      file('android/app/build/outputs/apk/release/app-release.apk');
      return { status: 0 };
    }
  );
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1], {
    command: process.execPath,
    args: [
      fs.realpathSync(path.join(root, 'node_modules/expo/bin/cli')),
      'run:android',
      '--variant',
      'release',
      '--no-bundler',
      '--binary',
      binary,
      '--device',
      'Pixel_Test',
    ],
    cwd: root,
  });
});

test('failed builds and missing output never install a stale application', (t) => {
  const { root, file } = fixture(t);
  const options = { projectRoot: root, platform: 'android', run: true };
  assert.throws(
    () => runBuild(options, () => ({ status: 0 })),
    /did not produce/
  );
  file('android/app/build/outputs/apk/release/app-release.apk');
  for (const result of [
    { status: 1 },
    { status: null, signal: 'SIGTERM' },
    { error: new Error('not found') },
  ]) {
    let count = 0;
    assert.throws(() =>
      runBuild(options, () => {
        count++;
        return result;
      })
    );
    assert.equal(count, 1);
  }
});

test('missing native project reports prebuild without executing commands', (t) => {
  const { root } = fixture(t);
  assert.throws(
    () =>
      runBuild(
        {
          projectRoot: path.join(root, 'missing'),
          platform: 'android',
          run: false,
        },
        () => assert.fail('must not execute')
      ),
    /prebuild --platform android/
  );
});

test('iOS discovers the scheme and uses the actual Xcode product path', {
  skip: process.platform !== 'darwin',
}, (t) => {
  const { root, file } = fixture(t);
  const output = file(
    'ios/build/Release-iphonesimulator/DifferentProduct.app/Info.plist'
  );
  const calls = [];
  const binary = runBuild(
    { projectRoot: root, platform: 'ios', run: true },
    (command, args) => {
      calls.push({ command, args });
      if (args.includes('-list'))
        return {
          status: 0,
          stdout: JSON.stringify({
            workspace: { schemes: ['Example', 'Pods-Example'] },
          }),
        };
      if (args.includes('-showBuildSettings'))
        return {
          status: 0,
          stdout: JSON.stringify([
            {
              buildSettings: {
                PRODUCT_TYPE: 'com.apple.product-type.application',
                TARGET_BUILD_DIR: path.dirname(path.dirname(output)),
                FULL_PRODUCT_NAME: 'DifferentProduct.app',
              },
            },
          ]),
        };
      return { status: 0 };
    }
  );
  assert.equal(binary, path.dirname(output));
  assert.equal(calls.length, 4);
  assert.ok(calls[2].args.includes('build'));
  assert.ok(calls[2].args.includes('Example'));
  assert.ok(calls[2].args.includes('iphonesimulator'));
  assert.deepEqual(calls[3].args.slice(-3), [
    '--no-bundler',
    '--binary',
    binary,
  ]);
});

test('iOS rejects ambiguous schemes before building', {
  skip: process.platform !== 'darwin',
}, (t) => {
  const { root } = fixture(t);
  let calls = 0;
  assert.throws(
    () =>
      runBuild({ projectRoot: root, platform: 'ios', run: false }, () => {
        calls++;
        return {
          status: 0,
          stdout: JSON.stringify({ workspace: { schemes: ['One', 'Two'] } }),
        };
      }),
    /--scheme/
  );
  assert.equal(calls, 1);
});
