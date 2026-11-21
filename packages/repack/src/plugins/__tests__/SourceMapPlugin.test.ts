import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { rspack } from '@rspack/core';
import memfs from 'memfs';
import { SourceMapPlugin } from '../SourceMapPlugin.js';

let context: string;

beforeAll(() => {
  context = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'repack-source-map-'))
  );
  fs.mkdirSync(path.join(context, 'src'));
  fs.writeFileSync(
    path.join(context, 'index.js'),
    "import { answer } from './src/answer.js';\nconsole.log(answer);"
  );
  fs.writeFileSync(
    path.join(context, 'src/answer.js'),
    'export const answer = 42;'
  );
});

afterAll(() => {
  fs.rmSync(context, { recursive: true, force: true });
});

async function getSourceMapSources(devtoolModuleFilenameTemplate?: string) {
  const fileSystem = memfs.createFsFromVolume(new memfs.Volume());

  const compiler = rspack({
    context,
    mode: 'development',
    devtool: 'source-map',
    entry: './index.js',
    output: {
      path: '/out',
      filename: 'index.bundle',
      devtoolModuleFilenameTemplate,
    },
    plugins: [new SourceMapPlugin({ platform: 'ios' })],
  });

  // @ts-expect-error memfs is compatible enough
  compiler.outputFileSystem = fileSystem;

  await new Promise<void>((resolve, reject) =>
    compiler.run((error) => (error ? reject(error) : resolve()))
  );

  const sourceMap = JSON.parse(
    fileSystem.readFileSync('/out/index.bundle.map', 'utf-8') as string
  );
  return sourceMap.sources as string[];
}

describe('SourceMapPlugin', () => {
  it('uses absolute paths in sources by default', async () => {
    const sources = await getSourceMapSources();

    expect(sources).toEqual(
      expect.arrayContaining([
        path.join(context, 'index.js'),
        path.join(context, 'src/answer.js'),
      ])
    );
  });

  it('uses output.devtoolModuleFilenameTemplate when set', async () => {
    const sources = await getSourceMapSources('app://[resource-path]');

    expect(sources).toEqual(
      expect.arrayContaining(['app://./index.js', 'app://./src/answer.js'])
    );
    expect(sources.some((source) => source.includes(context))).toBe(false);
  });
});
