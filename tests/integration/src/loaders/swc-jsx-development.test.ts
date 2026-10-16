import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getJsTransformRules } from '@callstack/repack';
import { describe, expect, inject, it } from 'vitest';
import {
  compile,
  createCompiler,
  createVirtualModulePlugin,
} from '../helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// JSX source info that development transforms add for the fixture
// (`jsxDEV` source argument for automatic runtime, `__source` prop for classic)
const SOURCE_INFO = /fileName: ".*App\.jsx"/;

async function compileJsx(
  mode: 'development' | 'production',
  swc: NonNullable<Parameters<typeof getJsTransformRules>[0]>['swc']
) {
  const virtualPlugin = await createVirtualModulePlugin({
    'App.jsx': 'export const App = () => <view title="hello" />;',
  });

  const compiler = await createCompiler({
    context: __dirname,
    mode,
    devtool: false,
    entry: './App.jsx',
    output: { path: '/out' },
    optimization: { minimize: false },
    externals: {
      react: 'commonjs react',
      'react/jsx-runtime': 'commonjs react/jsx-runtime',
      'react/jsx-dev-runtime': 'commonjs react/jsx-dev-runtime',
    },
    module: { rules: getJsTransformRules({ swc }) },
    plugins: [virtualPlugin],
  });

  const { code } = await compile(compiler);
  return code;
}

// builtin:swc-loader only exists in Rspack
describe.runIf(inject('bundlerType') === 'rspack')(
  'SWC JSX development transforms',
  () => {
    it('emits jsxDEV with source info for automatic runtime in development', async () => {
      const code = await compileJsx('development', { jsxRuntime: 'automatic' });

      expect(code).toContain('react/jsx-dev-runtime');
      expect(code).toContain('jsxDEV');
      expect(code).toMatch(SOURCE_INFO);
    });

    it('emits jsx without source info for automatic runtime in production', async () => {
      const code = await compileJsx('production', { jsxRuntime: 'automatic' });

      expect(code).toContain('react/jsx-runtime');
      expect(code).not.toContain('jsx-dev-runtime');
      expect(code).not.toContain('jsxDEV');
      expect(code).not.toMatch(SOURCE_INFO);
    });

    it('adds __source for classic runtime in development', async () => {
      const code = await compileJsx('development', { jsxRuntime: 'classic' });

      expect(code).toContain('createElement');
      expect(code).toContain('__source');
      expect(code).toMatch(SOURCE_INFO);
    });

    it('omits __source for classic runtime in production', async () => {
      const code = await compileJsx('production', { jsxRuntime: 'classic' });

      expect(code).toContain('createElement');
      expect(code).not.toContain('__source');
      expect(code).not.toMatch(SOURCE_INFO);
    });

    it('respects an explicit development: false in development', async () => {
      const code = await compileJsx('development', { development: false });

      expect(code).toContain('react/jsx-runtime');
      expect(code).not.toContain('jsxDEV');
      expect(code).not.toMatch(SOURCE_INFO);
    });

    it('respects an explicit development: true in production', async () => {
      const code = await compileJsx('production', { development: true });

      expect(code).toContain('react/jsx-dev-runtime');
      expect(code).toContain('jsxDEV');
      expect(code).toMatch(SOURCE_INFO);
    });
  }
);
