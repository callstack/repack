import type { Compiler as RspackCompiler } from '@rspack/core';
import type { Compiler as WebpackCompiler } from 'webpack';

/**
 * Check if the compiler is Rspack.
 * Reference: https://github.com/web-infra-dev/rspack/discussions/2640
 *
 * @param compiler Compiler instance to check.
 * @returns `true` if the compiler is Rspack, `false` otherwise.
 */
export function isRspackCompiler(compiler: RspackCompiler | WebpackCompiler) {
  return 'rspackVersion' in compiler.webpack;
}
