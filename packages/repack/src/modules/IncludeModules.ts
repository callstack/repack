/*
 * This module is added as an entry module to prevent stripping of these React Native deep imports from the bundle.
 * We use require.resolve from Rspack/Webpack to ensure these modules are included even if not directly used.
 * This allows us to include the modules into the bundle without evaluating them.
 * These modules are required by assetsLoader and should be shared as deep imports when using ModuleFederation.
 */

// Canonical asset registry request. NativeEntryPlugin aliases this to the real
// file for the installed React Native version (Libraries/Image/AssetRegistry on
// <= 0.86, src/asset-registry.js on >= 0.87). Keeping the `react-native/` prefix
// preserves Module Federation deep-import sharing.
require.resolve('react-native/asset-registry');
require.resolve('react-native/Libraries/Image/AssetSourceResolver');
