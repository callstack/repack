// A config that loads fine but instantiates no federation plugin — the
// duck-typed extraction has nothing to read and must fail loudly.
module.exports = {
  plugins: [{ apply() {} }],
};
