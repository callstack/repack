import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { compile, createCompiler } from '../helpers.js';

const require = createRequire(import.meta.url);
const repackRoot = path.dirname(
  require.resolve('@callstack/repack/package.json')
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
    'export default [homeScreen, localDep, hoistedDep, format];',
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

async function getSourceMapSources(loader: (typeof LOADERS)[number]) {
  const compiler = await createCompiler({
    context: projectRoot,
    mode: 'development',
    devtool: 'source-map',
    entry: './src/index.js',
    output: {
      path: '/out',
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          use: {
            loader: require.resolve(`@callstack/repack/${loader}`),
            options: {
              hermesParserPath: require.resolve('hermes-parser'),
            },
          },
        },
      ],
    },
  });

  const { volume } = await compile(compiler);
  const sourceMap = JSON.parse(
    volume.readFileSync('/out/main.js.map', 'utf-8') as string
  );
  // Rspack 2 joins `[absolute-resource-path]` onto the context without
  // resolving it, e.g. `<context>/../../node_modules/...`
  return (sourceMap.sources as string[]).map((source) =>
    path.isAbsolute(source) ? path.normalize(source) : source
  );
}

// Webpack, and Rspack when Babel writes the loader map, used to prepend the
// loader's `sourceRoot` to the absolute source path, naming files
// `<dir>/<absolute path>` in every source map.
it.each(LOADERS)(
  'names each file once in the source map with %s',
  async (loader) => {
    const sources = await getSourceMapSources(loader);

    expect(
      sources.filter((source) => source.startsWith(workspaceRoot)).sort()
    ).toEqual(
      Object.keys(FILES)
        .filter((file) => file.endsWith('.js'))
        .map((file) => path.join(workspaceRoot, file))
        .sort()
    );
  }
);
