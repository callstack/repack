import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getJsTransformRules } from '@callstack/repack';
import { NativeWindPlugin } from '@callstack/repack-plugin-nativewind';
import { describe, expect, inject, it } from 'vitest';
import { collectSwcLoaderOptions, createCompiler } from '../helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// builtin:swc-loader only exists in Rspack
describe.runIf(inject('bundlerType') === 'rspack')('NativeWindPlugin', () => {
  it('uses the NativeWind JSX import source in getJsTransformRules', async () => {
    const compiler = await createCompiler({
      context: __dirname,
      mode: 'development',
      entry: './index.js',
      output: { path: '/out' },
      module: { rules: getJsTransformRules() },
      plugins: [new NativeWindPlugin({ checkDependencies: false })],
    });

    const importSources = collectSwcLoaderOptions(
      compiler.options.module.rules
    ).map((options) => options.jsc?.transform?.react?.importSource);

    expect(importSources.length).toBeGreaterThan(0);
    expect(new Set(importSources)).toEqual(new Set(['nativewind']));
  });
});
