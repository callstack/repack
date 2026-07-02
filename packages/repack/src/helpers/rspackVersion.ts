import type { Compiler as RspackCompiler } from '@rspack/core';
import type { Compiler as WebpackCompiler } from 'webpack';

/**
 * Reads the version of the installed `@rspack/core` package without loading it.
 *
 * Resolving `@rspack/core/package.json` instead of importing the package keeps
 * this helper safe to call in any context:
 * - `@rspack/core` v2 is ESM-only, so a CJS `require('@rspack/core')` throws
 *   `ERR_REQUIRE_ESM` on Node < 20.19,
 * - `@rspack/core` is an optional peer dependency and may not be installed
 *   at all (webpack-only projects).
 *
 * @param context Optional directory to resolve `@rspack/core` from. Defaults
 * to Re.Pack's own resolution paths.
 * @returns Version string or `null` when `@rspack/core` is not resolvable.
 */
export function getRspackVersion(context?: string): string | null {
  try {
    const options = context ? { paths: [context] } : undefined;
    const packageJsonPath = require.resolve(
      '@rspack/core/package.json',
      options
    );
    const { version } = require(packageJsonPath) as { version: string };
    return version;
  } catch {
    return null;
  }
}

/**
 * Major version of the installed `@rspack/core` package,
 * or `null` when it's not resolvable.
 */
export function getRspackMajorVersion(context?: string): number | null {
  const version = getRspackVersion(context);
  if (!version) return null;
  return Number(version.split('.')[0]);
}

/**
 * Whether the installed `@rspack/core` package is version 2 or newer.
 * Returns `false` when `@rspack/core` is not resolvable.
 */
export function isRspack2(context?: string): boolean {
  return (getRspackMajorVersion(context) ?? 0) >= 2;
}

/**
 * Major version of Rspack derived from an already-created compiler instance.
 * Returns `null` for webpack compilers.
 */
export function getRspackMajorVersionFromCompiler(
  compiler: RspackCompiler | WebpackCompiler
): number | null {
  if ('rspackVersion' in compiler.webpack && compiler.webpack.rspackVersion) {
    return Number(compiler.webpack.rspackVersion.split('.')[0]);
  }
  return null;
}
