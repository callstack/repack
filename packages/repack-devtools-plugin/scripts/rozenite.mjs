// Runs the `rozenite` CLI with TypeScript 5 as `tsc`.
//
// `rozenite build` compiles the React Native and SDK entry points by spawning
// `tsc` from PATH, and its CommonJS pass uses `moduleResolution: node10`,
// which TypeScript 7 removed. The package keeps the workspace's TypeScript as
// its `typescript` dependency (so react-native resolves to the same peer
// variant as the tester apps and is not bundled twice) and gets TypeScript 5
// through the `typescript-5` alias, exposed here as `tsc`.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const packageRoot = path.dirname(import.meta.dirname);
const tsc = path.join(
  path.dirname(require.resolve('typescript-5/package.json')),
  'bin',
  'tsc'
);
const rozenite = path.join(
  path.dirname(require.resolve('rozenite/package.json')),
  'bin.js'
);

const binDir = path.join(packageRoot, 'node_modules', '.typescript-5-bin');
mkdirSync(binDir, { recursive: true });
writeFileSync(
  path.join(binDir, 'tsc'),
  `#!/bin/sh\nexec "${process.execPath}" "${tsc}" "$@"\n`,
  { mode: 0o755 }
);
writeFileSync(
  path.join(binDir, 'tsc.cmd'),
  `@"${process.execPath}" "${tsc}" %*\r\n`
);

const pathKey =
  Object.keys(process.env).find((key) => key.toUpperCase() === 'PATH') ??
  'PATH';
const result = spawnSync(
  process.execPath,
  [rozenite, ...process.argv.slice(2)],
  {
    cwd: packageRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      [pathKey]: `${binDir}${path.delimiter}${process.env[pathKey] ?? ''}`,
    },
  }
);
process.exit(result.status ?? 1);
