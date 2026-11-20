import { createContext, runInContext } from 'node:vm';
import { plugins } from '@callstack/repack';
import type { Configuration } from '@rspack/core';
import { describe, expect, it } from 'vitest';
import {
  compile,
  createCompiler,
  createVirtualModulePlugin,
} from '../helpers.js';

const data = { greeting: 'Bonjour le monde', items: [1, 2, 3] };

const virtualModules = {
  './index.cjs': `
    globalThis.data = require('./data.json');
    globalThis.animation = require('./animation.lottie.json');
  `,
  './data.json': JSON.stringify(data),
  './animation.lottie.json': JSON.stringify({ layers: ['lottie-layer'] }),
};

async function compileJson(config: Partial<Configuration>) {
  const virtualPlugin = await createVirtualModulePlugin(virtualModules);
  const compiler = await createCompiler({
    context: __dirname,
    mode: 'none',
    devtool: false,
    entry: './index.cjs',
    output: { path: '/out', filename: 'main.js', publicPath: '' },
    ...config,
    plugins: [virtualPlugin, ...(config.plugins ?? [])],
  } satisfies Configuration);

  return compile(compiler);
}

function executeBundle(code: string) {
  const context = createContext({});
  runInContext(code, context);
  return context;
}

describe('JsonParsePlugin', () => {
  it('keeps JSON.parse by default', async () => {
    const { code } = await compileJson({});

    expect(code).toContain("JSON.parse('");
    expect(executeBundle(code).data).toEqual(data);
  });

  it('bundles JSON as JS objects with jsonParse: false', async () => {
    const { code } = await compileJson({
      plugins: [new plugins.JsonParsePlugin(false)],
    });

    expect(code).not.toContain('JSON.parse(');
    expect(executeBundle(code).data).toEqual(data);
  });

  it("keeps the user's own .json rules", async () => {
    const { code, volume } = await compileJson({
      module: {
        rules: [{ test: /\.lottie\.json$/, type: 'asset/resource' }],
      },
      plugins: [new plugins.JsonParsePlugin(false)],
    });

    expect(code).not.toContain('lottie-layer');
    const emitted = Object.keys(volume.toJSON()).filter((file) =>
      file.endsWith('.json')
    );
    expect(emitted).toHaveLength(1);
    expect(executeBundle(code).data).toEqual(data);
  });

  it("keeps the user's own JSONParse setting", async () => {
    const { code } = await compileJson({
      module: { generator: { json: { JSONParse: true } } },
      plugins: [new plugins.JsonParsePlugin(false)],
    });

    expect(code).toContain("JSON.parse('");
  });
});
