/*
 * Added as an entry module so the modules Worklets Bundle Mode needs become part
 * of the bundle without being executed on the React Native Runtime. The runtime
 * module added by `bundleMode.ts` requires them at the right moment instead.
 *
 * Both requests are aliased to absolute paths by `WorkletsBundleModePlugin`, so
 * they resolve no matter where this file ends up in the dependency tree.
 */

require.resolve('@callstack/repack-plugin-reanimated/worklets-entry');
require.resolve('@callstack/repack-plugin-reanimated/worklets-polyfill');
