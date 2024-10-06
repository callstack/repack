/**
 * Generates regular expressions for matching module paths in both classic (npm, yarn) and exotic (pnpm) formats.
 *
 * In classic paths, the module name is escaped to match both forward slashes and backslashes.
 * In exotic paths, the module name's forward or backward slashes are replaced with `+`.
 *
 * @param moduleName The name of the module to generate paths for.
 * @returns An array of two RegExp objects: [classicPath, exoticPath].
 *
 * @category Webpack util
 *
 * @example Usage in Webpack config:
 * ```ts
 * import * as Repack from '@callstack/repack';
 *
 * return {
 *   ...,
 *   module: {
 *     rules: [
 *       ...,
 *       include: [
 *         ...Repack.getModulePaths('react-native'),
 *         ...Repack.getModulePaths('some-other-package'),
 *       ],
 *     ]
 *   }
 * }
 * ```
 */
export function getModulePaths(moduleName: string): RegExp[] {
  const escapedClassic = moduleName.replace(/[/\\]/g, '[/\\\\]');
  const escapedExotic = moduleName.replace(/[/\\]/g, '\\+');

  const classicPath = new RegExp(
    `node_modules([/\\\\])+${escapedClassic}[/\\\\]`
  );
  const exoticPath = new RegExp(
    `node_modules(.*[/\\\\])+${escapedExotic}[@\\+]`
  );

  return [classicPath, exoticPath];
}
