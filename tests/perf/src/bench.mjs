// Benchmarks production bundling of the fixture apps and, optionally, compares
// the results against another checkout (the PR base).
//
// Usage:
//   node src/bench.mjs                      # measure this checkout
//   node src/bench.mjs --base-ref main      # compare against merge-base with main
//   node src/bench.mjs --base ../repack-base --head .
//
// See ../README.md for all options.
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import zlib from 'node:zlib';
import { FIXTURES } from './config.mjs';
import { compareResults, renderReport } from './report.mjs';
import { sampleTreeRSS } from './sampleTreeRSS.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO_ROOT = path.resolve(HERE, '../../..');
const RESULT_MARKER = '__PERF_RESULT__';
const SIZE_KEYS = new Set([
  'mainBundleRaw',
  'mainBundleGzip',
  'jsTotalGzip',
  'sourceMapRaw',
  'assetsRaw',
]);

const { values: options } = parseArgs({
  options: {
    head: { type: 'string', default: REPO_ROOT },
    base: { type: 'string' },
    'base-ref': { type: 'string' },
    runs: { type: 'string', default: '5' },
    fixtures: { type: 'string' },
    out: { type: 'string', default: path.join(HERE, '../results') },
    'skip-build': { type: 'boolean', default: false },
    'no-fail': { type: 'boolean', default: false },
  },
});

const runs = Number(options.runs);
const fixtures = options.fixtures
  ? FIXTURES.filter((f) =>
      options.fixtures.split(',').some((name) => f.name.includes(name))
    )
  : FIXTURES;

if (fixtures.length === 0) {
  throw new Error(`No fixtures match '${options.fixtures}'`);
}

function log(message) {
  process.stderr.write(`[perf] ${message}\n`);
}

/**
 * Creates (or reuses) a git worktree of the merge-base between HEAD and `ref`,
 * installed and built, so it can be benchmarked side by side with HEAD.
 */
function prepareBaseWorktree(ref) {
  const git = (...args) =>
    execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf-8' }).trim();
  const sha = git('merge-base', 'HEAD', ref);
  // Must live outside any `node_modules`: loaders and bundler heuristics treat
  // such paths as third-party code, which skews both output and timings. The
  // temp dir also has no parent `node_modules` for resolution to walk into.
  // realpath: macOS tmpdir is a symlink, and a symlinked project root makes
  // emitted asset/chunk names absolute (module paths no longer sit under
  // `context`).
  const dir = path.join(
    fs.realpathSync(os.tmpdir()),
    'repack-perf',
    `base-${sha.slice(0, 12)}`
  );
  const readyMarker = path.join(dir, 'node_modules/.repack-perf-ready');
  if (!fs.existsSync(readyMarker)) {
    log(`Creating worktree for ${ref} (${sha.slice(0, 12)}) at ${dir}`);
    if (fs.existsSync(dir)) git('worktree', 'remove', '--force', dir);
    git('worktree', 'prune');
    git('worktree', 'add', '--detach', dir, sha);
    execFileSync('pnpm', ['install', '--frozen-lockfile'], {
      cwd: dir,
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    fs.writeFileSync(readyMarker, sha);
  }
  return dir;
}

function buildPackages(repoDir) {
  log(`Building Re.Pack packages in ${repoDir}`);
  const filters = [...new Set(fixtures.map((f) => f.appDir))].map(
    (appDir) => `--filter=./${appDir}^...`
  );
  execFileSync('pnpm', ['turbo', 'run', 'build', ...filters], {
    cwd: repoDir,
    stdio: ['ignore', 'ignore', 'inherit'],
  });
}

async function buildOnce(repoDir, fixture, outDir, statsFile) {
  fs.rmSync(outDir, { recursive: true, force: true });
  const job = {
    appDir: path.join(repoDir, fixture.appDir),
    configFile: fixture.configFile,
    platform: fixture.platform,
    outDir,
    statsFile,
  };

  const child = spawn(
    process.execPath,
    [path.join(HERE, 'build-once.mjs'), JSON.stringify(job)],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );
  const stopSampling = sampleTreeRSS(child.pid);

  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk;
  });
  child.stderr.on('data', (chunk) => {
    output += chunk;
  });
  const code = await new Promise((resolve) => child.on('close', resolve));
  const treeRSSBytes = await stopSampling();

  const line = output.split('\n').find((l) => l.startsWith(RESULT_MARKER));
  if (code !== 0 || !line) {
    process.stderr.write(output);
    throw new Error(`Build failed for ${fixture.name} in ${repoDir}`);
  }
  const result = JSON.parse(line.slice(RESULT_MARKER.length));
  return {
    ...result,
    treeRSSBytes: Math.max(treeRSSBytes, result.maxRSSBytes),
  };
}

function listFiles(dir) {
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) =>
      path.relative(dir, path.join(entry.parentPath ?? entry.path, entry.name))
    )
    .sort();
}

/**
 * Output size metrics of a finished build. Measured after every run, because
 * some setups don't produce the same output twice (see `nondeterministic` in
 * the report).
 */
function measureOutput(outDir, platform, repoDir) {
  // The bundle command also copies the main bundle to `bundleOutput`. Skip
  // that copy so it isn't counted twice.
  const bundleOutput =
    platform === 'ios' ? 'main.jsbundle' : `index.${platform}.bundle`;
  const files = listFiles(outDir).filter(
    (file) => file !== bundleOutput && file !== `${bundleOutput}.map`
  );

  const sizes = {};
  const metrics = {
    mainBundleRaw: 0,
    mainBundleGzip: 0,
    jsTotalGzip: 0,
    sourceMapRaw: 0,
    assetsRaw: 0,
  };
  for (const file of files) {
    let content = fs.readFileSync(path.join(outDir, file));
    const isMap = file.endsWith('.map');
    const isJs = !isMap && file.endsWith('.bundle');
    if (isMap) {
      // Source maps embed absolute paths, so their size would otherwise
      // depend on where the checkout lives.
      content = Buffer.from(content.toString().replaceAll(repoDir, '<root>'));
    }
    const entry = { raw: content.length };
    if (isJs) {
      entry.gzip = zlib.gzipSync(content, { level: 9 }).length;
      metrics.jsTotalGzip += entry.gzip;
      if (file === 'index.bundle') {
        metrics.mainBundleRaw = entry.raw;
        metrics.mainBundleGzip = entry.gzip;
      }
    } else if (isMap) {
      metrics.sourceMapRaw += entry.raw;
    } else {
      metrics.assetsRaw += entry.raw;
    }
    sizes[file] = entry;
  }
  return { metrics, files: sizes };
}

function readStatsMetrics(statsFile) {
  const stats = JSON.parse(fs.readFileSync(statsFile, 'utf-8'));
  const compilation = stats.children?.[0] ?? stats;
  // Concatenated modules hold their inner modules in `modules`; count leaves.
  const countModules = (modules = []) =>
    modules.reduce(
      (sum, m) => sum + (m.modules ? countModules(m.modules) : 1),
      0
    );
  return {
    modules: countModules(compilation.modules),
    chunks: compilation.chunks?.length ?? 0,
  };
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

async function main() {
  const targets = { head: fs.realpathSync(path.resolve(options.head)) };
  if (options['base-ref']) {
    targets.base = prepareBaseWorktree(options['base-ref']);
  } else if (options.base) {
    targets.base = fs.realpathSync(path.resolve(options.base));
  }

  if (!options['skip-build']) {
    for (const dir of Object.values(targets)) buildPackages(dir);
  }

  const workDir = path.join(options.out, 'work');
  const results = {};
  for (const [target, repoDir] of Object.entries(targets)) {
    results[target] = { repoDir, fixtures: {} };
  }

  for (const fixture of fixtures) {
    const slug = fixture.name.replaceAll('/', '-');

    // A fixture added by the PR doesn't exist in the base checkout yet; it is
    // then reported for head only.
    const fixtureTargets = Object.entries(targets).filter(
      ([target, repoDir]) => {
        const exists = fs.existsSync(
          path.join(repoDir, fixture.appDir, fixture.configFile)
        );
        if (!exists)
          log(`${fixture.name} [${target}] skipped: not in checkout`);
        return exists;
      }
    );
    for (const [target] of fixtureTargets) {
      results[target].fixtures[fixture.name] = { samples: [] };
    }

    // Warmup build: primes the file system cache and produces the stats for
    // module/chunk counts. Not included in timings because it also serializes
    // stats.
    for (const [target, repoDir] of fixtureTargets) {
      log(`${fixture.name} [${target}] warmup`);
      const outDir = path.join(workDir, target, slug);
      const statsFile = path.join(workDir, `${target}-${slug}.stats.json`);
      await buildOnce(repoDir, fixture, outDir, statsFile);
      const entry = results[target].fixtures[fixture.name];
      entry.metrics = readStatsMetrics(statsFile);
      entry.files = measureOutput(outDir, fixture.platform, repoDir).files;
    }

    // Interleave targets and alternate their order between runs so drift in
    // machine load (thermal throttling, noisy neighbours) affects both alike.
    const order = fixtureTargets.map(([target]) => target);
    for (let run = 0; run < runs; run++) {
      for (const target of run % 2 ? [...order].reverse() : order) {
        const outDir = path.join(workDir, target, slug);
        const sample = await buildOnce(targets[target], fixture, outDir);
        Object.assign(
          sample,
          measureOutput(outDir, fixture.platform, targets[target]).metrics
        );
        log(
          `${fixture.name} [${target}] run ${run + 1}/${runs}: ` +
            `${Math.round(sample.durationMs)}ms, ` +
            `${Math.round(sample.maxRSSBytes / 1024 / 1024)}MB`
        );
        results[target].fixtures[fixture.name].samples.push(sample);
      }
    }

    for (const target of order) {
      const entry = results[target].fixtures[fixture.name];
      entry.nondeterministic = [];
      for (const key of Object.keys(entry.samples[0])) {
        const values = entry.samples.map((s) => s[key]);
        entry.metrics[key] = median(values);
        if (SIZE_KEYS.has(key) && new Set(values).size > 1) {
          entry.nondeterministic.push(key);
        }
      }
    }
  }

  fs.rmSync(workDir, { recursive: true, force: true });

  const comparison = compareResults(results.head, results.base);
  const markdown = renderReport(comparison, {
    runs,
    platform: `${process.platform}-${process.arch}`,
    node: process.version,
  });

  fs.mkdirSync(options.out, { recursive: true });
  fs.writeFileSync(
    path.join(options.out, 'results.json'),
    JSON.stringify({ results, comparison }, null, 2)
  );
  fs.writeFileSync(path.join(options.out, 'report.md'), markdown);
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
  }

  process.stdout.write(`${markdown}\n`);
  log(`Results written to ${options.out}`);

  if (comparison.status === 'fail' && !options['no-fail']) {
    process.exitCode = 1;
  }
}

await main();
