// Fixtures and regression thresholds for the performance benchmarks.
//
// Every fixture is resolved relative to the checkout being measured, so the
// same definitions work for the PR head and its base.

export const FIXTURES = [
  {
    name: 'tester-app/rspack/ios',
    appDir: 'apps/tester-app',
    configFile: '__tests__/configs/rspack.config.mjs',
    platform: 'ios',
  },
  {
    name: 'tester-app/rspack/android',
    appDir: 'apps/tester-app',
    configFile: '__tests__/configs/rspack.config.mjs',
    platform: 'android',
  },
  {
    name: 'tester-app/webpack/ios',
    appDir: 'apps/tester-app',
    configFile: '__tests__/configs/webpack.config.mjs',
    platform: 'ios',
  },
  {
    name: 'tester-app/webpack/android',
    appDir: 'apps/tester-app',
    configFile: '__tests__/configs/webpack.config.mjs',
    platform: 'android',
  },
];

// `kind: 'exact'` metrics are deterministic for a given checkout, so any
// change is real and they use tight thresholds. `kind: 'sampled'` metrics vary
// between runs; they only fail when the change is large *and* the head and
// base samples don't overlap. Hosted CI runners are noisy, which is why the
// sampled thresholds are deliberately loose (Rspack's ecosystem benchmark uses
// 5% time / 30% memory on a dedicated runner). `failDelta` additionally fails
// on an absolute increase, regardless of the relative change.
export const METRICS = {
  mainBundleGzip: {
    label: 'Main bundle (gzip)',
    unit: 'bytes',
    kind: 'exact',
    warn: 0,
    fail: 0.01,
    minDelta: 512,
  },
  mainBundleRaw: {
    label: 'Main bundle (raw)',
    unit: 'bytes',
    kind: 'exact',
    warn: 0,
    fail: 0.01,
    minDelta: 1024,
  },
  jsTotalGzip: {
    label: 'All JS chunks (gzip)',
    unit: 'bytes',
    kind: 'exact',
    warn: 0,
    fail: 0.01,
    minDelta: 512,
  },
  sourceMapRaw: {
    label: 'Source maps (raw)',
    unit: 'bytes',
    kind: 'exact',
    warn: 0,
    fail: 0.05,
    minDelta: 4096,
  },
  assetsRaw: {
    label: 'Static assets (raw)',
    unit: 'bytes',
    kind: 'exact',
    warn: 0,
    fail: 0.05,
    minDelta: 1024,
  },
  modules: {
    label: 'Modules',
    unit: 'count',
    kind: 'exact',
    warn: 0,
    fail: null,
  },
  chunks: {
    label: 'Chunks',
    unit: 'count',
    kind: 'exact',
    warn: 0,
    fail: null,
  },
  durationMs: {
    label: 'Build time (median)',
    unit: 'ms',
    kind: 'sampled',
    warn: 0.05,
    fail: 0.15,
    minDelta: 300,
  },
  maxRSSBytes: {
    label: 'Peak RSS (main process)',
    unit: 'bytes',
    kind: 'sampled',
    warn: 0.05,
    fail: 0.3,
    // Peak RSS can be several GB (Rspack scales parallel loader workers with
    // CPU count), which would hide a large leak behind a relative threshold.
    failDelta: 512 * 1024 * 1024,
    minDelta: 32 * 1024 * 1024,
  },
  treeRSSBytes: {
    label: 'Peak RSS (process tree, sampled)',
    unit: 'bytes',
    kind: 'sampled',
    warn: 0.05,
    fail: 0.3,
    // Peak RSS can be several GB (Rspack scales parallel loader workers with
    // CPU count), which would hide a large leak behind a relative threshold.
    failDelta: 512 * 1024 * 1024,
    minDelta: 32 * 1024 * 1024,
  },
};
