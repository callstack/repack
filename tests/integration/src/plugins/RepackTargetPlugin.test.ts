import { createContext, runInContext } from 'node:vm';
import { plugins } from '@callstack/repack';
import type { Configuration } from '@rspack/core';
import { describe, expect, it } from 'vitest';
import {
  compile,
  createCompiler,
  createVirtualModulePlugin,
} from '../helpers.js';

class ForceModuleFactoriesPlugin {
  apply(compiler: any) {
    compiler.hooks.compilation.tap(
      'ForceModuleFactoriesPlugin',
      (compilation: any) => {
        compilation.hooks.additionalTreeRuntimeRequirements.tap(
          'ForceModuleFactoriesPlugin',
          (_chunk: unknown, runtimeRequirements: Set<string>) => {
            runtimeRequirements.add(compiler.webpack.RuntimeGlobals.require);
            runtimeRequirements.add(
              compiler.webpack.RuntimeGlobals.moduleFactories
            );
          }
        );
      }
    );
  }
}

async function compileRuntime(
  virtualModules: Record<string, string>,
  entry = './index.js'
) {
  const virtualPlugin = await createVirtualModulePlugin(virtualModules);
  const compiler = await createCompiler({
    context: __dirname,
    mode: 'development',
    devtool: false,
    entry,
    output: {
      path: '/out',
      filename: 'main.js',
    },
    plugins: [
      virtualPlugin,
      new ForceModuleFactoriesPlugin(),
      new plugins.RepackTargetPlugin(),
    ],
  } satisfies Configuration);

  return compile(compiler);
}

function executeBundle(code: string) {
  const fatalErrors: unknown[] = [];
  const context = createContext({
    ErrorUtils: {
      reportFatalError(error: unknown) {
        fatalErrors.push(error);
      },
    },
  });

  runInContext(code, context);

  return { context, fatalErrors };
}

describe('RepackTargetPlugin guarded require', () => {
  it('reports an uncaught startup module error as fatal', async () => {
    const { code } = await compileRuntime(
      {
        './index.cjs': 'throw new Error("startup module failed");',
      },
      './index.cjs'
    );

    const { fatalErrors } = executeBundle(code);

    expect(fatalErrors).toHaveLength(1);
    expect(fatalErrors[0]).toMatchObject({
      name: 'Error',
      message: 'startup module failed',
    });
  });

  it('preserves optional require and regular module error behavior', async () => {
    const { code } = await compileRuntime(
      {
        './index.cjs': `
        try {
          require('./optional.cjs');
        } catch (error) {
          globalThis.optionalRequireError = error.message;
        }

        globalThis.requireRegularModuleLater = function () {
          return require('./regular.cjs');
        };
      `,
        './optional.cjs': 'throw new Error("optional module failed");',
        './regular.cjs': 'throw new Error("regular module failed");',
      },
      './index.cjs'
    );

    const { context, fatalErrors } = executeBundle(code);

    expect(context.optionalRequireError).toBe('optional module failed');
    expect(fatalErrors).toHaveLength(0);

    expect(context.requireRegularModuleLater()).toBeUndefined();
    expect(fatalErrors).toHaveLength(1);
    expect(fatalErrors[0]).toMatchObject({
      name: 'Error',
      message: 'regular module failed',
    });
  });

  it('propagates ChunkLoadError to an asynchronous caller', async () => {
    const { code } = await compileRuntime(
      {
        './index.cjs': `
        globalThis.importChunkLater = function () {
          return Promise.resolve().then(function () {
            return require('./chunk.cjs');
          });
        };
      `,
        './chunk.cjs': `
        var error = new Error('Loading chunk test failed');
        error.name = 'ChunkLoadError';
        throw error;
      `,
      },
      './index.cjs'
    );

    const { context, fatalErrors } = executeBundle(code);

    await expect(context.importChunkLater()).rejects.toMatchObject({
      name: 'ChunkLoadError',
      message: 'Loading chunk test failed',
    });
    expect(fatalErrors).toHaveLength(0);
  });
});
