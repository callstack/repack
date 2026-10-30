// Expo's default Metro config. BENCH_METRO_TREE_SHAKING=1 opts into Expo's
// experimental tree shaking (together with the EXPO_UNSTABLE_* env vars set by
// the benchmark), which requires ESM import support.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

if (process.env.BENCH_METRO_TREE_SHAKING) {
  config.transformer.getTransformOptions = async () => ({
    transform: { experimentalImportSupport: true },
  });
}

module.exports = config;
