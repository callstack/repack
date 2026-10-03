import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { getCodegenTransformRules } from '@callstack/repack';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { compile, createCompiler } from '../helpers.js';

const require = createRequire(import.meta.url);
const repackRoot = path.dirname(
  require.resolve('@callstack/repack/package.json')
);
const swcRoot = path.dirname(require.resolve('@swc/core/package.json'));
const babelRuntimeRoot = path.dirname(
  require.resolve('@babel/runtime/package.json')
);
const fixtureRoot = fileURLToPath(
  new URL('./__fixtures__/react-native-parser/', import.meta.url)
);
const presets = ['legacy', 'current'] as const;
const loaders = ['babel-loader', 'babel-swc-loader'] as const;
const sourceFiles = [
  'index.js',
  'flow.js',
  'typescript.ts',
  'element.tsx',
  'jsx-runtime.js',
];

const codegenFile = 'ParserNativeComponent.js';

let workspaceRoot: string;
const originalNodePath = process.env.NODE_PATH;
const resetGlobalPaths = () =>
  (Module as typeof Module & { _initPaths(): void })._initPaths();

function linkPackage(root: string, name: string, packageRoot: string) {
  const destination = path.join(root, 'node_modules', name);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.symlinkSync(packageRoot, destination, 'junction');
}

function createFixtureProject(
  projectRoot: string,
  preset: (typeof presets)[number]
) {
  fs.mkdirSync(path.join(projectRoot, 'src'), { recursive: true });
  // Text fixtures keep Flow and standalone JSX out of repository checks.
  for (const file of [...sourceFiles, codegenFile]) {
    fs.copyFileSync(
      path.join(fixtureRoot, `${file}.txt`),
      path.join(projectRoot, 'src', file)
    );
  }
  fs.writeFileSync(
    path.join(projectRoot, 'babel.config.cjs'),
    `module.exports = { presets: ['module:@react-native/babel-preset'] };`
  );

  // Copy the published preset into a dependency island. A symlink straight
  // into pnpm's store would expose its shared node_modules directory, where
  // the legacy syntax plugin can be hoisted even for the current preset.
  const presetPackagePath = require.resolve(
    `@react-native/babel-preset-${preset}/package.json`
  );
  const presetRequire = createRequire(presetPackagePath);
  const resolvePresetPackage = (name: string) =>
    path.dirname(presetRequire.resolve(`${name}/package.json`));
  const isolatedPresetRoot = path.join(projectRoot, 'preset');
  fs.cpSync(path.dirname(presetPackagePath), isolatedPresetRoot, {
    recursive: true,
  });
  const presetPackage = JSON.parse(fs.readFileSync(presetPackagePath, 'utf-8'));
  for (const name of Object.keys(presetPackage.dependencies)) {
    linkPackage(isolatedPresetRoot, name, resolvePresetPackage(name));
  }
  linkPackage(projectRoot, '@react-native/babel-preset', isolatedPresetRoot);
  if (preset === 'current') {
    expect(() =>
      require.resolve('babel-plugin-syntax-hermes-parser', {
        paths: [isolatedPresetRoot],
      })
    ).toThrow();
  }

  linkPackage(projectRoot, '@callstack/repack', repackRoot);
  linkPackage(projectRoot, '@babel/runtime', babelRuntimeRoot);
  for (const name of [
    '@react-native/babel-plugin-codegen',
    '@babel/plugin-syntax-typescript',
  ]) {
    linkPackage(projectRoot, name, resolvePresetPackage(name));
  }
  // Webpack needs a resolvable SWC to exercise the SWC path instead of Babel.
  linkPackage(projectRoot, '@swc/core', swcRoot);
}

async function compileAndClose(config: Parameters<typeof createCompiler>[0]) {
  const compiler = await createCompiler(config);
  try {
    return await compile(compiler);
  } finally {
    await new Promise<void>((resolve, reject) => {
      compiler.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

function executeBundle(
  code: string,
  runtimeRequire?: (name: string) => unknown
) {
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: runtimeRequire,
  });
  return module.exports;
}

function requireNativeComponent(name: string) {
  if (name.endsWith('/codegenNativeComponent')) {
    return () => {
      throw new Error('Codegen declaration was not transformed');
    };
  }
  if (name.endsWith('/NativeComponentRegistry')) {
    return {
      get: (componentName: string, getConfig: () => unknown) => ({
        componentName,
        config: getConfig(),
      }),
    };
  }
  throw new Error(`Unexpected runtime dependency: ${name}`);
}

beforeAll(() => {
  // pnpm's Vitest shim adds its shared dependency directory to NODE_PATH.
  // Remove that fallback in this test worker to model a clean application.
  delete process.env.NODE_PATH;
  resetGlobalPaths();
  workspaceRoot = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'repack-react-native-parser-'))
  );

  for (const preset of presets) {
    createFixtureProject(path.join(workspaceRoot, preset), preset);
  }
});

afterAll(() => {
  if (originalNodePath === undefined) {
    delete process.env.NODE_PATH;
  } else {
    process.env.NODE_PATH = originalNodePath;
  }
  resetGlobalPaths();
  if (workspaceRoot) {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  }
});

describe.each(presets)('React Native %s parser dependencies', (preset) => {
  it.each(loaders)(
    'compiles Flow, TypeScript and TSX with %s and the default parser',
    async (loader) => {
      const projectRoot = path.join(workspaceRoot, preset);
      const { code, volume } = await compileAndClose({
        context: projectRoot,
        mode: 'development',
        devtool: 'source-map',
        entry: './src/index.js',
        resolve: {
          extensions: ['.js', '.ts', '.tsx'],
          alias: {
            'react/jsx-runtime': path.join(projectRoot, 'src/jsx-runtime.js'),
          },
        },
        output: {
          path: '/out',
          library: { type: 'commonjs2' },
          devtoolModuleFilenameTemplate: '[absolute-resource-path]',
        },
        module: {
          rules: [
            {
              test: /\.[jt]sx?$/,
              use: {
                loader: require.resolve(`@callstack/repack/${loader}`),
                options:
                  loader === 'babel-loader'
                    ? { root: projectRoot }
                    : {
                        hideParallelModeWarning: true,
                        babelOverrides: { cwd: projectRoot },
                      },
              },
            },
          ],
        },
      });

      expect(executeBundle(code)).toEqual({
        result: {
          flowResult: 'Hello Flow',
          typescriptResult: 'Hello TypeScript',
          element: { type: 'span', title: 'TSX' },
        },
      });

      const sourceMap = JSON.parse(
        volume.readFileSync('/out/main.js.map', 'utf-8') as string
      );
      for (const file of sourceFiles) {
        const sourcePath = path.join(projectRoot, 'src', file);
        const index = sourceMap.sources.indexOf(sourcePath);
        expect(index, `${file} has a source map entry`).toBeGreaterThanOrEqual(
          0
        );
        expect(sourceMap.sourcesContent[index]).toBe(
          fs.readFileSync(sourcePath, 'utf-8')
        );
      }
      expect(sourceMap.mappings).not.toBe('');
    }
  );

  it('generates a native component using the preset-owned syntax plugin', async () => {
    const projectRoot = path.join(workspaceRoot, preset);
    const { code } = await compileAndClose({
      context: projectRoot,
      mode: 'development',
      devtool: 'source-map',
      entry: `./src/${codegenFile}`,
      output: { path: '/out', library: { type: 'commonjs2' } },
      externals: (
        { request }: { request?: string },
        callback: (error?: Error | null, result?: string) => void
      ) => {
        if (request?.startsWith('react-native/')) {
          callback(null, `commonjs ${request}`);
        } else {
          callback();
        }
      },
      module: {
        rules: [
          {
            test: /\.js$/,
            use: {
              loader: require.resolve('@callstack/repack/babel-loader'),
              options: { root: projectRoot },
            },
          },
          ...getCodegenTransformRules().map((rule) => ({
            ...rule,
            use: {
              ...rule.use,
              loader: require.resolve('babel-loader', { paths: [repackRoot] }),
              options: {
                ...rule.use.options,
                cwd: projectRoot,
                // Stock Babel emits map objects; Re.Pack's loader expects a
                // serialized input map. Keep this syntax-selection test focused.
                sourceMaps: false,
              },
            },
          })),
        ],
      },
    });

    expect(executeBundle(code, requireNativeComponent)).toMatchObject({
      default: {
        componentName: 'ParserView',
        config: {
          uiViewClassName: 'ParserView',
          validAttributes: { title: true },
        },
      },
    });
  });
});
