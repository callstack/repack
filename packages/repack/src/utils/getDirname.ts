import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Converts a `file:///` URL to an absolute directory path.
 * Useful in ESM Webpack configs where `__dirname` is unavailable.
 *
 * @param fileUrl The `file:///` URL of a module.
 * @returns The directory path without the `file:///` prefix.
 *
 * @category Webpack util
 *
 * @example Usage in a Webpack ESM config:
 * ```ts
 * import * as Repack from '@callstack/repack';
 *
 * export default (env) => {
 *   const {
 *     context = Repack.getDirname(import.meta.url)
 *   } = env;
 * };
 * ```
 */
export function getDirname(fileUrl: string) {
  return path.dirname(fileURLToPath(fileUrl));
}
