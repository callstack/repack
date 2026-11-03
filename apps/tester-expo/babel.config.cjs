module.exports = function babelConfig(api) {
  api.cache(true);
  return {
    // linked Re.Pack and SymbolicationProbe must deep-import RN; the warning's toast steals e2e taps
    presets: [['babel-preset-expo', { disableDeepImportWarnings: true }]],
  };
};
