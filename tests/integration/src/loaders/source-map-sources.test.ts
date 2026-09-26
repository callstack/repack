import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { compile, createCompiler } from '../helpers.js';

const require = createRequire(import.meta.url);
const repackRoot = path.dirname(
  require.resolve('@callstack/repack/package.json')
);

// SourceMapPlugin is applied by RepackPlugin, which also needs a full
// React Native setup. Load it from the build output to test it on its own.
const { SourceMapPlugin } = require(
  path.join(repackRoot, 'dist/plugins/SourceMapPlugin.js')
);

const LOADERS = ['babel-loader', 'babel-swc-loader'] as const;

// A monorepo with an app two levels below the workspace root. Files inside
// the app cover the standalone case; the workspace package and the hoisted
// dependency cover files resolved outside of the project root.
const FILES: Record<string, string> = {
  'apps/app/src/index.js': [
    "import { homeScreen } from './screens/Home Screen';",
    "import { localDep } from 'local-dep';",
    "import { hoistedDep } from 'hoisted-dep';",
    "import { format } from '../../../packages/shared/src/format';",
    'globalThis.modules = [homeScreen, localDep, hoistedDep, format];',
  ].join('\n'),
  'apps/app/src/screens/Home Screen.js':
    "export const homeScreen = () => 'home';",
  'apps/app/node_modules/local-dep/package.json':
    '{ "name": "local-dep", "main": "index.js" }',
  'apps/app/node_modules/local-dep/index.js':
    "export const localDep = () => 'local';",
  'node_modules/hoisted-dep/package.json':
    '{ "name": "hoisted-dep", "main": "index.js" }',
  'node_modules/hoisted-dep/index.js':
    "export const hoistedDep = () => 'hoisted';",
  'packages/shared/src/format.js':
    'export const format = (value) => value.trim();',
};

const DEV_SOURCES = [
  '[projectRoot]/src/index.js',
  '[projectRoot]/src/screens/Home Screen.js',
  '[projectRoot]/node_modules/local-dep/index.js',
  '[projectRoot^2]/node_modules/hoisted-dep/index.js',
  '[projectRoot^2]/packages/shared/src/format.js',
];

const RELEASE_SOURCES = [
  'apps/app/src/index.js',
  'apps/app/src/screens/Home Screen.js',
  'apps/app/node_modules/local-dep/index.js',
  'node_modules/hoisted-dep/index.js',
  'packages/shared/src/format.js',
];

let workspaceRoot: string;
let projectRoot: string;

beforeAll(() => {
  // Resolve symlinks (e.g. /var -> /private/var on macOS) so the bundler
  // sees the same project root that the files resolve to.
  workspaceRoot = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'repack-source-names-'))
  );
  projectRoot = path.join(workspaceRoot, 'apps/app');

  for (const [file, content] of Object.entries(FILES)) {
    const filePath = path.join(workspaceRoot, file);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }

  // Webpack only uses swc when the project can resolve `@swc/core`.
  fs.mkdirSync(path.join(workspaceRoot, 'node_modules/@swc'));
  fs.symlinkSync(
    path.dirname(
      require.resolve('@swc/core/package.json', { paths: [repackRoot] })
    ),
    path.join(workspaceRoot, 'node_modules/@swc/core'),
    'junction'
  );
});

afterAll(() => {
  fs.rmSync(workspaceRoot, { recursive: true, force: true });
});

async function getSourceMapSources(
  loader: (typeof LOADERS)[number],
  { dev }: { dev: boolean }
) {
  const compiler = await createCompiler({
    context: projectRoot,
    mode: dev ? 'development' : 'production',
    devtool: 'source-map',
    // SourceMapPlugin uses `[projectRoot]` source names only for the
    // development server.
    devServer: dev ? { host: 'localhost', port: 8081 } : undefined,
    entry: './src/index.js',
    output: { path: '/out' },
    optimization: { minimize: false },
    module: {
      rules: [
        {
          test: /\.js$/,
          use: {
            loader: require.resolve(`@callstack/repack/${loader}`),
            options: {
              hermesParserPath: require.resolve('hermes-parser'),
              ...(loader === 'babel-swc-loader' && {
                hideParallelModeWarning: true,
              }),
            },
          },
        },
      ],
    },
    plugins: [new SourceMapPlugin({ platform: 'ios' })],
  });

  const { volume } = await compile(compiler);
  const sourceMap = JSON.parse(
    volume.readFileSync('/out/main.js.map', 'utf-8') as string
  );
  return sourceMap.sources as string[];
}

describe.each(LOADERS)('source map source names with %s', (loader) => {
  it('names files once relative to the project root in development', async () => {
    const sources = await getSourceMapSources(loader, { dev: true });
    const projectSources = sources.filter((source) =>
      source.startsWith('[projectRoot')
    );

    expect(projectSources.sort()).toEqual([...DEV_SOURCES].sort());
  });

  it('names files once by their absolute path in release builds', async () => {
    const sources = await getSourceMapSources(loader, { dev: false });
    const fileSources = sources.filter((source) =>
      source.startsWith(workspaceRoot)
    );

    expect(fileSources.sort()).toEqual(
      RELEASE_SOURCES.map((file) => path.join(workspaceRoot, file)).sort()
    );
    for (const source of fileSources) {
      expect(fs.existsSync(source)).toBe(true);
    }
  });
});
