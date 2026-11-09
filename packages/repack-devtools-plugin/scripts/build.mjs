// Builds the panels and React Native entry (`rozenite build`) and the
// dev-server entry (`tsc`). Rozenite and Vite 7 need Node 20.19+, so on older
// Node (the Node 18 test matrix) the build is skipped. Nothing loads this
// package unless a tester's dev server runs with WITH_ROZENITE=true, and its
// tests run from source.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 20 || (major === 20 && minor < 19)) {
  console.warn(
    `Skipping @callstack/repack-devtools-plugin build: it needs Node 20.19+ (current ${process.versions.node}), so WITH_ROZENITE=true won't work on this Node version.`
  );
  process.exit(0);
}

const require = createRequire(import.meta.url);
const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const tsc = path.join(
  path.dirname(require.resolve('typescript/package.json')),
  'bin',
  'tsc'
);

for (const args of [
  [path.join(scriptsDir, 'rozenite.mjs'), 'build'],
  [tsc, '-p', 'tsconfig.bundler.json'],
]) {
  const result = spawnSync(process.execPath, args, {
    cwd: path.dirname(scriptsDir),
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
