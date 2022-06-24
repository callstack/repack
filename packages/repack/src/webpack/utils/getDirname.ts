import path from 'path';
import { URL } from 'url';

/**
 * Get absolute directory (without any protocol) from a `file://` URL of a module.
 * Mostly useful in ESM Webpack configs, where `__dirname` is not available, but `import.meta.url` is.
 *
 * @param fileUrl String with absolute `file://` URL of a module.
 * @returns Absolute dirname without `file://` of a module pointed by `fileUrl`.
 *
 * @category Webpack util
 *
 * @example Usage in Webpack config (ESM):
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
  return path.dirname(new URL(fileUrl).pathname);
}
