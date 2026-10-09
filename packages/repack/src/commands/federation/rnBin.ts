import fs from 'node:fs';
import path from 'node:path';
import { CLIError } from '../../helpers/index.js';

/** The resolution call this module rides — injectable for tests (jest's
 * own resolver never misses, so the missing-package mapping is unpinnable
 * without the seam; production always uses the real `require.resolve`). */
type ResolvePackages = (
  request: string,
  options: { paths: string[] }
) => string;

/**
 * Resolve the app's LOCAL `react-native` CLI script to an absolute path.
 *
 * Resolution is a pure module-resolution chain rooted at `appRoot` alone —
 * Node's upward `node_modules` walk from the app's own directory (which
 * also follows pnpm's symlinked layout) — so PATH is never consulted and
 * neither the caller's cwd nor any other app's install can stand in for
 * this app's own CLI (threat row "Executable-file classification"). An
 * app rooted where react-native does not resolve is an error for THAT
 * app; callers must not fall back to another root — federation-dev names
 * the failing app and exits 2.
 *
 * The plan executes the result as `process.execPath <cli.js> …` — spawning
 * the `.bin/react-native` shim would break under some pnpm layouts, the
 * resolved cli.js is deterministic.
 *
 * @param appRoot the app whose install owns the CLI
 * @param options.requireResolve resolution seam for tests only
 */
export function resolveReactNativeBin(
  appRoot: string,
  options: { requireResolve?: ResolvePackages } = {}
): string {
  const { requireResolve = require.resolve } = options;
  let packageJsonPath: string;
  try {
    packageJsonPath = requireResolve('react-native/package.json', {
      paths: [appRoot],
    });
  } catch {
    throw new CLIError(
      `Cannot resolve the "react-native" package from ${appRoot} — ` +
        'federation-dev runs each app with its own local react-native CLI; ' +
        'install react-native in the app.'
    );
  }

  const packageDir = path.dirname(packageJsonPath);
  const manifest = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as {
    bin?: Record<string, string> | string;
  };
  const bin =
    typeof manifest.bin === 'string'
      ? manifest.bin
      : manifest.bin?.['react-native'];
  if (!bin) {
    throw new CLIError(
      `The react-native package at ${packageDir} declares no ` +
        '"bin.react-native" script — it cannot be used to start an app.'
    );
  }
  return path.resolve(packageDir, bin);
}
