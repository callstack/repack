import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import {
  getCodegenTransformRules,
  getJsTransformRules,
} from '@callstack/repack';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { compile, createCompiler } from '../helpers.js';

const require = createRequire(import.meta.url);
const repackRoot = path.dirname(
  require.resolve('@callstack/repack/package.json')
);
const swcRoot = path.dirname(require.resolve('@swc/core/package.json'));
const babelRuntimeRoot = path.dirname(
  require.resolve('@babel/runtime/package.json')
);
const flowEnumsRuntimeRoot = path.dirname(
  require.resolve('flow-enums-runtime/package.json')
);
// `getJsTransformRules` emits external SWC helpers, apps install them
const swcHelpersRoot = path.dirname(
  createRequire(require.resolve('@rspack/core/package.json')).resolve(
    '@swc/helpers/package.json'
  )
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
// Flow syntax that `flow-remove-types` alone cannot strip
const flowSyntaxFiles = [
  'component.js',
  'ref-component.js',
  'hook.js',
  'enum.js',
  'match.js',
];

const FLOW_LIB_FILES: Record<string, string> = {
  'package.json': '{ "name": "flow-lib", "main": "index.js" }',
  'index.js': [
    '// @flow',
    "import type { Marker } from './marker';",
    // unused value import, kept for its side effect
    "import marker from './marker';",
    '',
    'export enum Mode { Visible, Hidden }',
    '',
    'export component Badge(label: string) {',
    '  return { label };',
    '}',
    '',
    'export hook useMode(value: string): ?Mode {',
    '  return Mode.cast(value);',
    '}',
    '',
    'export function describeCount(count: number): string {',
    "  return match (count) { 0 => 'none', _ => 'some' };",
    '}',
  ].join('\n'),
  'marker.js': [
    '// @flow',
    'export type Marker = string;',
    "globalThis.flowLibMarker = 'loaded';",
    'export default null;',
  ].join('\n'),
};

let workspaceRoot: string;
const originalNodePath = process.env.NODE_PATH;
const resetGlobalPaths = () =>
  (Module as typeof Module & { _initPaths(): void })._initPaths();

function linkPackage(root: string, name: string, packageRoot: string) {
  const destination = path.join(root, 'node_modules', name);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.symlinkSync(packageRoot, destination, 'junction');
}

function writeReactPackage(root: string, version: string) {
  const reactRoot = path.join(root, 'node_modules/react');
  fs.mkdirSync(reactRoot, { recursive: true });
  fs.writeFileSync(
    path.join(reactRoot, 'package.json'),
    JSON.stringify({ name: 'react', version, main: 'index.js' })
  );
  fs.writeFileSync(
    path.join(reactRoot, 'index.js'),
    "exports.forwardRef = (render) => ({ $$typeof: 'react.forward_ref', render });"
  );
}

function createFixtureProject(
  projectRoot: string,
  preset: (typeof presets)[number]
) {
  fs.mkdirSync(path.join(projectRoot, 'src'), { recursive: true });
  // Text fixtures keep Flow and standalone JSX out of repository checks.
  for (const file of [...sourceFiles, codegenFile, ...flowSyntaxFiles]) {
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

  // Flow `component` lowering depends on the React version: the project uses
  // React 19, a nested project overrides it with React 18
  writeReactPackage(projectRoot, '19.2.0');
  const react18Root = path.join(projectRoot, 'react18');
  fs.mkdirSync(path.join(react18Root, 'src'), { recursive: true });
  fs.copyFileSync(
    path.join(fixtureRoot, 'ref-component.js.txt'),
    path.join(react18Root, 'src/ref-component.js')
  );
  writeReactPackage(react18Root, '18.3.1');
  fs.copyFileSync(
    path.join(projectRoot, 'babel.config.cjs'),
    path.join(react18Root, 'babel.config.cjs')
  );

  // pnpm layout: lowered Flow enums need `flow-enums-runtime`, which only
  // React Native depends on, so it can't be resolved from the project root
  const reactNativeStoreRoot = path.join(
    projectRoot,
    'node_modules/.pnpm/react-native@0.0.0-test'
  );
  const reactNativeRoot = path.join(
    reactNativeStoreRoot,
    'node_modules/react-native'
  );
  fs.mkdirSync(reactNativeRoot, { recursive: true });
  fs.writeFileSync(
    path.join(reactNativeRoot, 'package.json'),
    JSON.stringify({ name: 'react-native', version: '0.0.0-test' })
  );
  linkPackage(reactNativeStoreRoot, 'flow-enums-runtime', flowEnumsRuntimeRoot);
  linkPackage(projectRoot, 'react-native', reactNativeRoot);

  // A Flow-typed dependency, installed the way pnpm does
  const flowLibRoot = path.join(
    projectRoot,
    'node_modules/.pnpm/flow-lib@1.0.0/node_modules/flow-lib'
  );
  fs.mkdirSync(flowLibRoot, { recursive: true });
  for (const [file, content] of Object.entries(FLOW_LIB_FILES)) {
    fs.writeFileSync(path.join(flowLibRoot, file), content);
  }
  linkPackage(projectRoot, 'flow-lib', flowLibRoot);
  for (const name of [
    '@react-native/babel-plugin-codegen',
    '@babel/plugin-syntax-typescript',
  ]) {
    linkPackage(projectRoot, name, resolvePresetPackage(name));
  }
  // Webpack needs a resolvable SWC to exercise the SWC path instead of Babel.
  linkPackage(projectRoot, '@swc/core', swcRoot);
  linkPackage(projectRoot, '@swc/helpers', swcHelpersRoot);
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

  const legacyPresetRequire = createRequire(
    require.resolve('@react-native/babel-preset-legacy/package.json')
  );
  for (const fixture of ['unsupported-preset', 'missing-flow-parser']) {
    const projectRoot = path.join(workspaceRoot, fixture);
    const presetRoot = path.join(
      projectRoot,
      'node_modules/@react-native/babel-preset'
    );
    fs.mkdirSync(presetRoot, { recursive: true });
    fs.writeFileSync(
      path.join(projectRoot, 'index.js'),
      '// @flow\nmodule.exports = 42;'
    );
    fs.writeFileSync(
      path.join(presetRoot, 'package.json'),
      JSON.stringify({
        name: '@react-native/babel-preset',
        version: '99.0.0-test',
        dependencies:
          fixture === 'missing-flow-parser' ? { 'flow-parser': '*' } : {},
      })
    );
    linkPackage(projectRoot, '@callstack/repack', repackRoot);
    linkPackage(projectRoot, '@swc/core', swcRoot);
    if (fixture === 'missing-flow-parser') {
      // A broken Flow installation must not silently use a hoisted Hermes plugin.
      linkPackage(
        projectRoot,
        'babel-plugin-syntax-hermes-parser',
        path.dirname(
          legacyPresetRequire.resolve(
            'babel-plugin-syntax-hermes-parser/package.json'
          )
        )
      );
    }
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

  function compileWithFlowLoader(
    file: (typeof flowSyntaxFiles)[number],
    {
      devtool = false,
      project = '.',
    }: { devtool?: 'source-map' | false; project?: '.' | 'react18' } = {}
  ) {
    const projectRoot = path.join(workspaceRoot, preset, project);
    return compileAndClose({
      context: projectRoot,
      mode: 'development',
      devtool,
      entry: `./src/${file}`,
      output: {
        path: '/out',
        library: { type: 'commonjs2' },
        devtoolModuleFilenameTemplate: '[absolute-resource-path]',
      },
      module: {
        rules: [
          {
            test: /\.js$/,
            use: {
              loader: require.resolve('@callstack/repack/flow-loader'),
              options: { all: true },
            },
          },
        ],
      },
    });
  }

  async function bundleWithFlowLoader(
    file: (typeof flowSyntaxFiles)[number],
    project?: '.' | 'react18'
  ) {
    const { code } = await compileWithFlowLoader(file, { project });
    return executeBundle(code);
  }

  it('maps lowered Flow syntax back to the original source', async () => {
    const { volume } = await compileWithFlowLoader('component.js', {
      devtool: 'source-map',
    });

    const sourceMap = JSON.parse(
      volume.readFileSync('/out/main.js.map', 'utf-8') as string
    );
    const sourcePath = path.join(workspaceRoot, preset, 'src/component.js');
    const index = sourceMap.sources.indexOf(sourcePath);
    expect(index).toBeGreaterThanOrEqual(0);
    expect(sourceMap.sourcesContent[index]).toBe(
      fs.readFileSync(sourcePath, 'utf-8')
    );
  });

  it('lowers Flow component syntax with flow-loader', async () => {
    const { Greeting } = (await bundleWithFlowLoader('component.js')) as {
      Greeting: (props: { name: string; excited?: boolean }) => unknown;
    };
    expect(Greeting({ name: 'Flow' })).toEqual({ greeting: 'Hello Flow' });
    expect(Greeting({ name: 'Flow', excited: true })).toEqual({
      greeting: 'Hello Flow!',
    });
  });

  // The preset strips Flow enums before its enum plugin runs, so the React
  // Native parser has to lower them itself
  async function bundleWithBabelLoader(
    loader: (typeof loaders)[number],
    file: (typeof flowSyntaxFiles)[number],
    project: '.' | 'react18' = '.'
  ) {
    const projectRoot = path.join(workspaceRoot, preset, project);
    const { code } = await compileAndClose({
      context: projectRoot,
      mode: 'development',
      devtool: false,
      entry: `./src/${file}`,
      output: { path: '/out', library: { type: 'commonjs2' } },
      module: {
        rules: [
          {
            test: /\.js$/,
            // keep SWC's own ESM helpers out of the SWC transform
            exclude: /node_modules/,
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

    return executeBundle(code);
  }

  it.each(loaders)('keeps Flow enums working with %s', async (loader) => {
    const { Status, parseStatus } = (await bundleWithBabelLoader(
      loader,
      'enum.js'
    )) as {
      Status: { Active: unknown; members: () => Iterable<unknown> };
      parseStatus: (value: string) => unknown;
    };
    expect(parseStatus('Active')).toBe(Status.Active);
    expect([...Status.members()]).toEqual(['Active', 'Paused']);
  });

  it.each(loaders)(
    'wraps components with refs in forwardRef on React 18 with %s',
    async (loader) => {
      const { Field } = (await bundleWithBabelLoader(
        loader,
        'ref-component.js',
        'react18'
      )) as {
        Field: {
          $$typeof: string;
          render: (props: { label: string }, ref: unknown) => unknown;
        };
      };
      const ref = () => {};
      expect(Field.$$typeof).toBe('react.forward_ref');
      expect(Field.render({ label: 'Name' }, ref)).toEqual({
        label: 'Name',
        ref,
      });
    }
  );

  it('passes component refs as a prop on React 19', async () => {
    const { Field } = (await bundleWithFlowLoader('ref-component.js')) as {
      Field: (props: { label: string; ref: unknown }) => unknown;
    };
    const ref = () => {};
    expect(Field({ label: 'Name', ref })).toEqual({ label: 'Name', ref });
  });

  it('wraps components with refs in forwardRef on React 18', async () => {
    const { Field } = (await bundleWithFlowLoader(
      'ref-component.js',
      'react18'
    )) as {
      Field: {
        $$typeof: string;
        render: (props: { label: string }, ref: unknown) => unknown;
      };
    };
    const ref = () => {};
    expect(Field.$$typeof).toBe('react.forward_ref');
    expect(Field.render({ label: 'Name' }, ref)).toEqual({
      label: 'Name',
      ref,
    });
  });

  it('lowers Flow hook syntax with flow-loader', async () => {
    const { useDouble } = (await bundleWithFlowLoader('hook.js')) as {
      useDouble: (value: number) => number;
    };
    expect(useDouble(21)).toBe(42);
  });

  it('lowers Flow enums to flow-enums-runtime with flow-loader', async () => {
    const { Status, parseStatus } = (await bundleWithFlowLoader('enum.js')) as {
      Status: { Active: unknown; members: () => Iterable<unknown> };
      parseStatus: (value: string) => unknown;
    };
    expect(parseStatus('Active')).toBe(Status.Active);
    expect(parseStatus('Unknown')).toBeUndefined();
    expect([...Status.members()]).toEqual(['Active', 'Paused']);
  });

  it('lowers Flow match expressions with flow-loader', async () => {
    const { describeCount } = (await bundleWithFlowLoader('match.js')) as {
      describeCount: (count: number) => string;
    };
    expect([0, -1, 5].map(describeCount)).toEqual(['none', 'one', 'many']);
  });

  // builtin:swc-loader only exists in Rspack
  it.runIf(inject('bundlerType') === 'rspack')(
    'compiles a Flow-typed dependency with getJsTransformRules',
    async () => {
      const projectRoot = path.join(workspaceRoot, preset);
      fs.writeFileSync(
        path.join(projectRoot, 'src/flow-lib-app.js'),
        [
          "import { Badge, Mode, describeCount, useMode } from 'flow-lib';",
          'export const result = {',
          "  badge: Badge({ label: 'Flow' }),",
          "  mode: useMode('Hidden') === Mode.Hidden,",
          '  count: describeCount(0),',
          '  marker: globalThis.flowLibMarker,',
          '};',
        ].join('\n')
      );

      const { code } = await compileAndClose({
        context: projectRoot,
        mode: 'development',
        devtool: false,
        entry: './src/flow-lib-app.js',
        output: { path: '/out', library: { type: 'commonjs2' } },
        module: {
          rules: getJsTransformRules({
            flow: { include: ['flow-lib'] },
            codegen: { enabled: false },
          }),
        },
      });

      expect(executeBundle(code)).toEqual({
        result: {
          badge: { label: 'Flow' },
          mode: true,
          count: 'none',
          marker: 'loaded',
        },
      });
    }
  );
});

describe.each(['unsupported-preset', 'missing-flow-parser'])(
  'React Native parser errors: %s',
  (fixture) => {
    it.each([...loaders, 'syntax-plugin'])(
      'reports the preset and parser dependencies through %s',
      async (loader) => {
        const projectRoot = path.join(workspaceRoot, fixture);
        const babelOptions = {
          cwd: projectRoot,
          babelrc: false,
          configFile: false,
        };
        const use =
          loader === 'syntax-plugin'
            ? {
                loader: require.resolve('babel-loader', {
                  paths: [repackRoot],
                }),
                options: {
                  ...babelOptions,
                  plugins: [
                    '@callstack/repack/babel-plugin-syntax-react-native',
                  ],
                },
              }
            : {
                loader: require.resolve(`@callstack/repack/${loader}`),
                options:
                  loader === 'babel-loader'
                    ? babelOptions
                    : {
                        hideParallelModeWarning: true,
                        babelOverrides: babelOptions,
                      },
              };

        await expect(
          compileAndClose({
            context: projectRoot,
            mode: 'development',
            entry: './index.js',
            output: { path: '/out' },
            module: { rules: [{ test: /\.js$/, use }] },
          })
        ).rejects.toThrow(
          `Failed to resolve the React Native parser from @react-native/babel-preset@99.0.0-test (${path.join(projectRoot, 'node_modules/@react-native/babel-preset/package.json')}). ` +
            `Make sure '@react-native/babel-preset' and its parser dependencies ` +
            `('flow-parser' or 'babel-plugin-syntax-hermes-parser' with 'hermes-parser') are installed.`
        );
      }
    );
  }
);
