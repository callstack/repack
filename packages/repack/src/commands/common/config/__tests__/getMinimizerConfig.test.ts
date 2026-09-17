import { importDefaultESM } from '../../../../helpers/index.js';
import { getMinimizerConfig } from '../getMinimizerConfig.js';

jest.mock('../../../../helpers/index.js', () => ({
  ...jest.requireActual('../../../../helpers/index.js'),
  importDefaultESM: jest.fn(),
}));

const importDefaultESMMock = jest.mocked(importDefaultESM);

// the filter `terser-webpack-plugin` puts on its own minifiers since 5.6.0
const acceptsJsOnly = (name: string) => /\.[cm]?js(\?.*)?$/i.test(name);

// the shape `terser-webpack-plugin` normalizes `minify` and `terserOptions` into
type NormalizedPlugin = {
  options: {
    minimizer: {
      implementation: ((
        input: Record<string, string>,
        sourceMap: undefined,
        minimizerOptions: unknown,
        extractComments: boolean
      ) => Promise<{ code: string }>) & {
        filter?: (name: string) => boolean;
        getMinimizerVersion: () => string | undefined;
      };
      options: unknown;
    };
  };
};

// an asset is skipped when the configured minifier declares a `filter` rejecting its name
function isMinified(minifier: { filter?: (name: string) => boolean }) {
  return (
    typeof minifier.filter !== 'function' || minifier.filter('index.bundle')
  );
}

describe('getMinimizerConfig', () => {
  it('should minify .bundle assets with a plugin that only accepts .js', async () => {
    const PluginMock = Object.assign(jest.fn(), {
      terserMinify: Object.assign(jest.fn(), { filter: acceptsJsOnly }),
    });
    importDefaultESMMock.mockResolvedValue(PluginMock);

    await getMinimizerConfig('webpack', '/project');

    const { minify } = PluginMock.mock.calls[0][0];
    const implementation = minify ?? PluginMock.terserMinify;

    expect(implementation.filter).toBeUndefined();
    expect(isMinified(implementation)).toBe(true);
  });

  it('should run terser on a .bundle asset after worker serialization', async () => {
    importDefaultESMMock.mockImplementation(async (path) => require(path));

    const [minimizer] = await getMinimizerConfig('webpack', process.cwd());
    const { implementation, options } = (
      minimizer as unknown as NormalizedPlugin
    ).options.minimizer;

    // the plugin re-evaluates the minifier from its source inside a worker,
    // where `require` belongs to the worker and not to Re.Pack
    const workerRequire = jest.fn((id: string) => require(id));
    const deserialized = new Function('require', `return ${implementation}`)(
      workerRequire
    );
    const { code } = await deserialized(
      { 'index.bundle': 'const answer = 40 + 2;' },
      undefined,
      options,
      false
    );

    expect(code).toBe('const answer=42;');
    // it loads the copy the config resolved, not whatever `terser-webpack-plugin` means in the worker
    expect(workerRequire).toHaveBeenCalledWith(
      require.resolve('terser-webpack-plugin')
    );
  });

  it('should report the terser version the built-in minifier reports', async () => {
    importDefaultESMMock.mockImplementation(async (path) => require(path));

    const [minimizer] = await getMinimizerConfig('webpack', process.cwd());
    const { implementation } = (minimizer as unknown as NormalizedPlugin)
      .options.minimizer;
    const { terserMinify } = require('terser-webpack-plugin');

    // the plugin puts this in the chunk hash, so losing it would stale the cache
    expect(implementation.getMinimizerVersion()).toEqual(expect.any(String));
    expect(implementation.getMinimizerVersion()).toBe(
      terserMinify.getMinimizerVersion()
    );
  });
});
