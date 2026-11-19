import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { rspack } from '@rspack/core';
import webpack from 'webpack';

import * as Repack from '../../index.js';
import { SentryDebugIdPlugin } from '../SentryDebugIdPlugin.js';

const DEBUG_ID_REGEX =
  /_sentryDebugIdIdentifier\s*=\s*"sentry-dbid-([0-9a-f-]{36})"/;

interface CompileOptions {
  bundler?: 'rspack' | 'webpack';
  mode?: 'production' | 'development';
  filename?: string;
  entries?: Record<string, string>;
  plugin?: { apply(compiler: any): void };
  context?: string;
}

async function compile(options: CompileOptions = {}) {
  // An explicit `mode: undefined` leaves mode unset, so the bundler default applies.
  const mode = 'mode' in options ? options.mode : 'production';
  return compileWithMode(mode, options);
}

async function compileWithMode(
  mode: CompileOptions['mode'],
  {
    bundler = 'rspack',
    filename = '[name].bundle',
    entries = { index: "console.log('hello');" },
    plugin = new SentryDebugIdPlugin(),
    context = fs.mkdtempSync(path.join(os.tmpdir(), 'sentry-debug-id-')),
  }: CompileOptions
) {
  const outputPath = path.join(context, 'out');
  for (const [name, code] of Object.entries(entries)) {
    fs.writeFileSync(path.join(context, `${name}.js`), code);
  }

  const config = {
    context,
    ...(mode && { mode }),
    devtool: 'source-map' as const,
    entry: Object.fromEntries(
      Object.keys(entries).map((name) => [name, `./${name}.js`])
    ),
    output: { filename, path: outputPath },
    plugins: [plugin],
  };
  const compiler =
    bundler === 'rspack' ? rspack(config) : webpack(config as any);

  await new Promise<void>((resolve, reject) => {
    compiler.run((error: Error | null, stats: any) => {
      if (error) {
        reject(error);
        return;
      }
      if (stats?.hasErrors()) {
        reject(new Error(stats.toString({ all: false, errors: true })));
        return;
      }
      compiler.close(() => resolve());
    });
  });

  const read = (file: string) => {
    const bundle = fs.readFileSync(path.join(outputPath, file), 'utf-8');
    const mapPath = path.join(outputPath, `${file}.map`);
    const sourceMap = fs.existsSync(mapPath)
      ? JSON.parse(fs.readFileSync(mapPath, 'utf-8'))
      : undefined;
    return {
      bundle,
      sourceMap,
      debugId: bundle.match(DEBUG_ID_REGEX)?.[1],
    };
  };

  return {
    read,
    context,
    cleanup: () => fs.rmSync(context, { recursive: true }),
  };
}

describe('SentryDebugIdPlugin', () => {
  it('injects a Debug ID into the bundle and its source map', async () => {
    const { read, cleanup } = await compile();
    const { bundle, sourceMap, debugId } = read('index.bundle');
    cleanup();

    expect(debugId).toBeDefined();
    expect(sourceMap.debugId).toBe(debugId);
    expect(sourceMap.debug_id).toBe(debugId);

    expect(bundle).toMatch(
      new RegExp(`//# debugId=${debugId}\\n//# sourceMappingURL=`)
    );
  });

  it('injects a Debug ID for bundles with a .js extension', async () => {
    const { read, cleanup } = await compile({ filename: '[name].js' });
    const { sourceMap, debugId } = read('index.js');
    cleanup();

    expect(debugId).toBeDefined();
    expect(sourceMap.debugId).toBe(debugId);
  });

  it('gives each chunk its own Debug ID', async () => {
    const { read, cleanup } = await compile({
      entries: {
        index: "console.log('hello');",
        other: "console.log('other');",
      },
    });
    const index = read('index.bundle');
    const other = read('other.bundle');
    cleanup();

    expect(index.sourceMap.debugId).toBe(index.debugId);
    expect(other.sourceMap.debugId).toBe(other.debugId);
    expect(index.debugId).not.toBe(other.debugId);
  });

  it('derives the Debug ID from the bundle content', async () => {
    const first = await compile();
    const firstId = first.read('index.bundle').debugId;
    const second = await compile({ context: first.context });
    const secondId = second.read('index.bundle').debugId;
    const changed = await compile({
      context: first.context,
      entries: { index: "console.log('changed');" },
    });
    const changedId = changed.read('index.bundle').debugId;
    changed.cleanup();

    expect(firstId).toBe(secondId);
    expect(changedId).not.toBe(firstId);
  });

  it('skips development builds', async () => {
    const { read, cleanup } = await compile({ mode: 'development' });
    const { bundle, sourceMap, debugId } = read('index.bundle');
    cleanup();

    expect(debugId).toBeUndefined();
    expect(bundle).not.toContain('//# debugId=');
    expect(sourceMap.debugId).toBeUndefined();
  });

  it.each(['rspack', 'webpack'] as const)(
    'treats an unset mode as production with %s',
    async (bundler) => {
      // Given a config without `mode`, which both bundlers default to production
      // webpack's devtool only emits maps for `.js` files.
      const filename = bundler === 'webpack' ? '[name].js' : '[name].bundle';
      const { read, cleanup } = await compile({
        bundler,
        filename,
        mode: undefined,
      });

      // When the bundle is read back
      const { sourceMap, debugId } = read(filename.replace('[name]', 'index'));
      cleanup();

      // Then it still gets a Debug ID that matches its map
      expect(debugId).toBeDefined();
      expect(sourceMap.debugId).toBe(debugId);
    }
  );

  it('works with webpack', async () => {
    const { read, cleanup } = await compile({
      bundler: 'webpack',
      filename: '[name].js',
    });
    const { bundle, sourceMap, debugId } = read('index.js');
    cleanup();

    expect(debugId).toBeDefined();
    expect(sourceMap.debugId).toBe(debugId);
    expect(bundle).toContain(`//# debugId=${debugId}`);
  });

  it('is exposed as Repack.plugins.SentryDebugIdPlugin', async () => {
    const { read, cleanup } = await compile({
      plugin: new Repack.plugins.SentryDebugIdPlugin(),
    });
    const { sourceMap, debugId } = read('index.bundle');
    cleanup();

    expect(debugId).toBeDefined();
    expect(sourceMap.debugId).toBe(debugId);
  });
});
