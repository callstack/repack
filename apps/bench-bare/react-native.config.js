// BENCH_BUNDLER=metro keeps the CLI's built-in Metro commands, so the same app
// can be bundled by both Metro and Re.Pack.
module.exports = {
  commands:
    process.env.BENCH_BUNDLER === 'metro'
      ? []
      : require('@callstack/repack/commands'),
};
