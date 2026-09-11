/*
 * This module is added as an entry module to prevent stripping of these React Native deep imports from the bundle.
 * We use require.resolve from Rspack/Webpack to ensure these modules are included even if not directly used.
 * This allows us to include the modules into the bundle without evaluating them.
 * These modules are required by assetsLoader and should be shared as deep imports when using ModuleFederation.
 */

// react-native/Libraries/Image/AssetRegistry was replaced by react-native/asset-registry in newer versions.
try {
  require.resolve('react-native/Libraries/Image/AssetRegistry');
} catch {
  require.resolve('react-native/asset-registry');
}
require.resolve('react-native/Libraries/Image/AssetSourceResolver');
