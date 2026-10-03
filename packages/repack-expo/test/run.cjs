// Runs the package tests, or skips them on Node.js versions below this
// package's `engines.node` floor. The repository test matrix still covers
// older Node.js versions for the other packages, and Expo's tooling (for
// example `util.parseEnv` in @expo/env) does not run there.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const packageRoot = path.resolve(__dirname, '..');
const { engines } = require(path.join(packageRoot, 'package.json'));

const [requiredMajor, requiredMinor = 0] = engines.node
  .replace(/^>=/, '')
  .split('.')
  .map(Number);
const [major, minor] = process.versions.node.split('.').map(Number);

if (
  major < requiredMajor ||
  (major === requiredMajor && minor < requiredMinor)
) {
  console.log(
    `Skipping @callstack/repack-expo tests: Node.js ${process.versions.node} does not satisfy engines.node "${engines.node}".`
  );
  process.exit(0);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: packageRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const testFiles = fs
  .readdirSync(__dirname)
  .filter((file) => file.endsWith('.test.cjs'))
  .map((file) => path.join('test', file));

run('pnpm', ['build']);
run(process.execPath, ['--test', ...testFiles]);
