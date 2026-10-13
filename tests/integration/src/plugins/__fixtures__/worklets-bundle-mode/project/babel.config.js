// Turns Bundle Mode on where Worklets itself does it, which is the only source of truth
// `detectWorkletsBundleMode` reads. Mirrors `apps/tester-app/babel.config.js`.
module.exports = {
  plugins: [['react-native-worklets/plugin', { bundleMode: true }]],
};
