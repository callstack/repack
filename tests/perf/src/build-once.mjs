// Runs a single production bundle in this process and prints a JSON result
// line. Spawned in a fresh process per sample by `bench.mjs`, so peak RSS and
// timings are not polluted by previous builds.
//
// Usage: node build-once.mjs <json-encoded job>
//   job = { appDir, configFile, platform, outDir, statsFile? }
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const job = JSON.parse(process.argv[2]);

// Resolve Re.Pack from the app being measured, not from this package, so the
// same harness can benchmark a different checkout (e.g. the PR base).
const requireFromApp = createRequire(path.join(job.appDir, 'package.json'));
const commandsPath = requireFromApp.resolve('@callstack/repack/commands');
const { default: commands } = await import(pathToFileURL(commandsPath).href);
const bundleCommand = commands.find((command) => command.name === 'bundle');

const bundleOutput = path.join(
  job.outDir,
  job.platform === 'ios' ? 'main.jsbundle' : `index.${job.platform}.bundle`
);

// Read by the fixture configs to place every emitted file under outDir.
process.env.TEST_WEBPACK_OUTPUT_DIR = job.outDir;
process.env.REPACK_BUNDLE_FILENAME = bundleOutput;
process.env.NODE_ENV = 'production';

const cliConfig = {
  root: job.appDir,
  platforms: { ios: {}, android: {} },
  reactNativePath: path.join(job.appDir, 'node_modules/react-native'),
};

const args = {
  platform: job.platform,
  entryFile: 'index.js',
  bundleOutput,
  dev: false,
  webpackConfig: path.join(job.appDir, job.configFile),
  ...(job.statsFile ? { json: job.statsFile, stats: 'normal' } : {}),
};

const start = process.hrtime.bigint();
await bundleCommand.func([''], cliConfig, args);
const durationMs = Number(process.hrtime.bigint() - start) / 1e6;

// maxRSS covers this process including worker threads (Rspack's native
// threads and parallel loaders). Child processes (webpack's thread-loader,
// terser workers) are not included.
const { maxRSS } = process.resourceUsage();

process.stdout.write(
  `\n__PERF_RESULT__${JSON.stringify({ durationMs, maxRSSBytes: maxRSS * 1024 })}\n`
);
process.exit(0);
