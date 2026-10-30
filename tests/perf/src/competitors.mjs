// Benchmarks Re.Pack against other React Native bundlers, each pair on the
// same app, at several app sizes:
// - apps/bench-expo: Expo Router app, Metro via Expo CLI vs Re.Pack;
// - apps/bench-bare: bare React Native app, Metro via the React Native CLI vs
//   Re.Pack.
// Unlike bench.mjs this is not a regression gate: it produces the numbers for
// comparing bundlers and finding performance wins.
//
// Usage:
//   node src/competitors.mjs [--scales 0,1000,3000] [--runs 3] [--platform ios]
//                            [--variants bare-metro,bare-repack] [--skip-dev]
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import zlib from 'node:zlib';
import { generateScreens } from './generate-screens.mjs';
import { sampleTreeRSS } from './sampleTreeRSS.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO_ROOT = path.resolve(HERE, '../../..');

const APPS = {
  expo: {
    dir: path.join(REPO_ROOT, 'apps/bench-expo'),
    // Edited in the dev server benchmark; must be part of the main bundle.
    editFile: 'app/details.tsx',
  },
  bare: {
    dir: path.join(REPO_ROOT, 'apps/bench-bare'),
    editFile: 'src/App.tsx',
  },
};
const bin = (app, name) => path.join(APPS[app].dir, 'node_modules/.bin', name);

const { values: options } = parseArgs({
  options: {
    scales: { type: 'string', default: '0,1000,3000' },
    runs: { type: 'string', default: '3' },
    platform: { type: 'string', default: 'ios' },
    variants: { type: 'string' },
    out: { type: 'string', default: path.join(HERE, '../results/competitors') },
    'skip-dev': { type: 'boolean', default: false },
  },
});

const runs = Number(options.runs);
const platform = options.platform;
const scales = options.scales.split(',').map(Number);

// `bundler`: 'expo' = Metro through Expo CLI, 'metro' = Metro through the
// React Native CLI, 'repack' = Re.Pack through the React Native CLI.
// `dev: true` variants also get the dev server benchmark.
const VARIANTS = {
  'expo-metro': {
    label: 'Metro (Expo CLI)',
    app: 'expo',
    bundler: 'expo',
    env: {},
    dev: true,
  },
  'expo-metro-treeshake': {
    label: 'Metro (Expo CLI) + experimental tree shaking',
    app: 'expo',
    bundler: 'expo',
    env: {
      BENCH_METRO_TREE_SHAKING: '1',
      EXPO_UNSTABLE_TREE_SHAKING: '1',
      EXPO_UNSTABLE_METRO_OPTIMIZE_GRAPH: '1',
    },
  },
  'expo-repack': {
    label: 'Re.Pack (Rspack), Expo app',
    app: 'expo',
    bundler: 'repack',
    env: {},
    dev: true,
  },
  'expo-repack-cache': {
    label: 'Re.Pack (Rspack) + persistent cache, Expo app',
    app: 'expo',
    bundler: 'repack',
    env: { BENCH_RSPACK_CACHE: '1' },
  },
  'bare-metro': {
    label: 'Metro (React Native CLI)',
    app: 'bare',
    bundler: 'metro',
    env: { BENCH_BUNDLER: 'metro' },
    dev: true,
  },
  'bare-repack': {
    label: 'Re.Pack (Rspack), bare app',
    app: 'bare',
    bundler: 'repack',
    env: {},
    dev: true,
  },
  'bare-repack-cache': {
    label: 'Re.Pack (Rspack) + persistent cache, bare app',
    app: 'bare',
    bundler: 'repack',
    env: { BENCH_RSPACK_CACHE: '1' },
  },
};
const variants = options.variants
  ? options.variants.split(',')
  : Object.keys(VARIANTS);
for (const variant of variants) {
  if (!VARIANTS[variant]) throw new Error(`Unknown variant '${variant}'`);
}
const apps = [...new Set(variants.map((v) => VARIANTS[v].app))];

/**
 * Clears every bundler cache. Metro's `--reset-cache` / `--clear` alone is not
 * enough: run twice in a row, the second run still hits the transform cache.
 */
function clearCaches() {
  for (const app of Object.values(APPS)) {
    fs.rmSync(path.join(app.dir, 'node_modules/.cache/rspack'), {
      recursive: true,
      force: true,
    });
  }
  const tmp = fs.realpathSync(os.tmpdir());
  for (const entry of fs.readdirSync(tmp)) {
    if (entry === 'metro-cache' || entry.startsWith('metro-file-map-')) {
      fs.rmSync(path.join(tmp, entry), { recursive: true, force: true });
    }
  }
}
const BASE_ENV = {
  ...process.env,
  CI: '1',
  EXPO_NO_TELEMETRY: '1',
  PLATFORM: platform,
};

function log(message) {
  process.stderr.write(`[competitors] ${message}\n`);
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

function summarize(samples) {
  const out = {};
  for (const key of Object.keys(samples[0])) {
    const values = samples.map((s) => s[key]);
    out[key] = {
      median: median(values),
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }
  return out;
}

/**
 * Runs `command` under `/usr/bin/time -p` (for user+sys CPU time including
 * worker processes) while sampling the process tree's peak RSS.
 */
async function measureCommand(cwd, command, args, env) {
  const start = process.hrtime.bigint();
  const child = spawn('/usr/bin/time', ['-p', command, ...args], {
    cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stopSampling = sampleTreeRSS(child.pid);
  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk;
  });
  child.stderr.on('data', (chunk) => {
    output += chunk;
  });
  const code = await new Promise((resolve) => child.on('close', resolve));
  const wallMs = Number(process.hrtime.bigint() - start) / 1e6;
  const peakRSSBytes = await stopSampling();
  if (code !== 0) {
    process.stderr.write(output);
    throw new Error(`${command} ${args.join(' ')} failed with ${code}`);
  }
  const seconds = (name) =>
    Number(output.match(new RegExp(`^${name}\\s+([\\d.]+)`, 'm'))?.[1] ?? 0);
  return {
    wallMs,
    cpuMs: (seconds('user') + seconds('sys')) * 1000,
    peakRSSBytes,
  };
}

function buildArgs(variant, outDir, cold) {
  const { app, bundler } = VARIANTS[variant];
  const bundleOutput = path.join(outDir, 'main.jsbundle');
  if (bundler === 'expo') {
    return [
      bin(app, 'expo'),
      [
        'export:embed',
        '--platform',
        platform,
        '--dev',
        'false',
        '--bundle-output',
        bundleOutput,
        '--sourcemap-output',
        `${bundleOutput}.map`,
        '--assets-dest',
        path.join(outDir, 'assets'),
        ...(cold ? ['--reset-cache'] : []),
      ],
    ];
  }
  return [
    bin(app, 'react-native'),
    [
      'bundle',
      '--platform',
      platform,
      '--dev',
      'false',
      '--entry-file',
      'index.js',
      '--bundle-output',
      bundleOutput,
      '--sourcemap-output',
      `${bundleOutput}.map`,
      '--assets-dest',
      path.join(outDir, 'assets'),
      ...(cold && bundler === 'metro' ? ['--reset-cache'] : []),
    ],
  ];
}

async function build(variant, outDir, cold) {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  if (cold) clearCaches();
  const [command, args] = buildArgs(variant, outDir, cold);
  return measureCommand(APPS[VARIANTS[variant].app].dir, command, args, {
    ...BASE_ENV,
    ...VARIANTS[variant].env,
    // Re.Pack's emitted chunks; the main bundle goes to --bundle-output.
    BENCH_OUTPUT_DIR: path.join(outDir, 'chunks'),
  });
}

function hermesc(appDir) {
  const pkg = path.dirname(
    execFileSync(
      process.execPath,
      [
        '-p',
        "require.resolve('hermes-compiler/package.json', { paths: [require.resolve('react-native/package.json')] })",
      ],
      { cwd: appDir, encoding: 'utf-8' }
    ).trim()
  );
  const dir = process.platform === 'darwin' ? 'osx-bin' : 'linux64-bin';
  return path.join(pkg, 'hermesc', dir, 'hermesc');
}

function measureOutput(outDir, appDir) {
  const main = fs.readFileSync(path.join(outDir, 'main.jsbundle'));
  const chunksDir = path.join(outDir, 'chunks');
  const chunks = fs.existsSync(chunksDir)
    ? fs
        .readdirSync(chunksDir)
        .filter((f) => f.endsWith('.chunk.bundle'))
        .map((f) => fs.readFileSync(path.join(chunksDir, f)))
    : [];

  const hbcFile = path.join(outDir, 'main.hbc');
  execFileSync(hermesc(appDir), [
    '-emit-binary',
    '-O',
    '-w',
    '-out',
    hbcFile,
    path.join(outDir, 'main.jsbundle'),
  ]);

  const map = JSON.parse(
    fs.readFileSync(path.join(outDir, 'main.jsbundle.map'), 'utf-8')
  );
  const sources = new Set(
    (map.sources ?? map.sections?.flatMap((s) => s.map.sources) ?? []).filter(
      Boolean
    )
  );

  return {
    bundleRaw: main.length,
    bundleGzip: zlib.gzipSync(main, { level: 9 }).length,
    bundleBrotli: zlib.brotliCompressSync(main).length,
    hermesBytecode: fs.statSync(hbcFile).size,
    asyncChunks: chunks.length,
    asyncChunksRaw: chunks.reduce((sum, c) => sum + c.length, 0),
    sourceModules: sources.size,
  };
}

/** Kills a detached process and everything it spawned. */
async function killTree(child) {
  if (child.exitCode !== null) return;
  const closed = new Promise((resolve) => child.on('close', resolve));
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {}
  const timeout = setTimeout(() => {
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {}
  }, 5000);
  await closed;
  clearTimeout(timeout);
}

async function fetchUntil(url, predicate, deadline) {
  while (Date.now() < deadline) {
    let response;
    try {
      response = await fetch(url);
    } catch {
      // Server not listening yet.
    }
    if (response) {
      const body = await response.text();
      if (!response.ok) {
        throw new Error(
          `${url} returned ${response.status}: ${body.slice(0, 500)}`
        );
      }
      if (predicate(body)) return body;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

/**
 * Starts the dev server with cold caches and measures:
 * - time from spawn to the first development bundle being served,
 * - time from editing a source file to a bundle containing the edit.
 */
async function measureDev(variant, port) {
  const { app, bundler, env } = VARIANTS[variant];
  const appDir = APPS[app].dir;
  clearCaches();
  const [command, args, url] = {
    expo: [
      bin(app, 'expo'),
      ['start', '--port', String(port), '--clear'],
      // Expo's native apps request this virtual entry; the server root is
      // the monorepo root, so a path-based entry wouldn't resolve.
      `http://localhost:${port}/.expo/.virtual-metro-entry.bundle?platform=${platform}&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable`,
    ],
    metro: [
      bin(app, 'react-native'),
      ['start', '--port', String(port), '--reset-cache'],
      `http://localhost:${port}/index.bundle?platform=${platform}&dev=true&minify=false`,
    ],
    repack: [
      bin(app, 'react-native'),
      ['start', '--port', String(port)],
      `http://localhost:${port}/index.bundle?platform=${platform}`,
    ],
  }[bundler];

  const start = Date.now();
  // Without CI=1: Metro disables file watching in CI mode. With stdio
  // ignored, neither CLI prompts anyway.
  const { CI: _ci, ...devEnv } = BASE_ENV;
  const child = spawn(command, args, {
    cwd: appDir,
    env: { ...devEnv, ...env },
    stdio: 'ignore',
    detached: true,
  });
  const stopSampling = sampleTreeRSS(child.pid);
  const editFile = path.join(appDir, APPS[app].editFile);
  const original = fs.readFileSync(editFile, 'utf-8');

  try {
    await fetchUntil(url, () => true, start + 10 * 60 * 1000);
    const startupMs = Date.now() - start;

    const rebuilds = [];
    for (let i = 0; i < runs; i++) {
      const marker = `BENCH_EDIT_${Date.now()}_${i}`;
      const editStart = Date.now();
      fs.writeFileSync(
        editFile,
        `${original}\nexport const benchMarker = '${marker}';\n`
      );
      await fetchUntil(
        url,
        (body) => body.includes(marker),
        editStart + 2 * 60 * 1000
      );
      rebuilds.push(Date.now() - editStart);
    }
    return {
      startupMs,
      rebuildMs: median(rebuilds),
      rebuildSamples: rebuilds,
      peakRSSBytes: await stopSampling(),
    };
  } finally {
    fs.writeFileSync(editFile, original);
    await killTree(child);
    await stopSampling();
  }
}

function generate(screens) {
  for (const app of apps) generateScreens(app, APPS[app].dir, screens);
}

async function main() {
  const workDir = path.join(options.out, 'work');
  const results = {
    meta: {
      date: new Date().toISOString(),
      platform,
      runs,
      machine: `${os.cpus()[0].model} · ${os.cpus().length} cores · ${Math.round(os.totalmem() / 1024 ** 3)} GB`,
      os: `${process.platform}-${process.arch}`,
      node: process.version,
    },
    variants: Object.fromEntries(
      variants.map((v) => [
        v,
        { label: VARIANTS[v].label, app: VARIANTS[v].app },
      ])
    ),
    scales: {},
  };
  const save = () => {
    fs.mkdirSync(options.out, { recursive: true });
    fs.writeFileSync(
      path.join(options.out, 'results.json'),
      JSON.stringify(results, null, 2)
    );
  };

  try {
    for (const screens of scales) {
      log(`Generating ${screens} screens`);
      generate(screens);
      const scale = { build: {}, dev: {} };
      results.scales[screens] = scale;

      for (const variant of variants) {
        const outDir = path.join(workDir, variant);
        const cold = [];
        const warm = [];
        for (let i = 0; i < runs; i++) {
          cold.push(await build(variant, outDir, true));
          log(
            `${screens} screens · ${variant} cold ${i + 1}/${runs}: ${Math.round(cold.at(-1).wallMs)}ms`
          );
        }
        const output = measureOutput(outDir, APPS[VARIANTS[variant].app].dir);
        for (let i = 0; i < runs; i++) {
          warm.push(await build(variant, outDir, false));
          log(
            `${screens} screens · ${variant} warm ${i + 1}/${runs}: ${Math.round(warm.at(-1).wallMs)}ms`
          );
        }
        scale.build[variant] = {
          cold: summarize(cold),
          warm: summarize(warm),
          output,
        };
        save();
      }

      if (!options['skip-dev']) {
        const devVariants = variants.filter((v) => VARIANTS[v].dev);
        for (const [index, variant] of devVariants.entries()) {
          log(`${screens} screens · ${variant} dev server`);
          scale.dev[variant] = await measureDev(variant, 8090 + index);
          log(
            `${screens} screens · ${variant} dev: startup ${scale.dev[variant].startupMs}ms, ` +
              `rebuild ${scale.dev[variant].rebuildMs}ms`
          );
          save();
        }
      }
    }
  } finally {
    generate(0);
    fs.rmSync(workDir, { recursive: true, force: true });
    save();
  }
  log(`Results written to ${path.join(options.out, 'results.json')}`);
}

await main();
