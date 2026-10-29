import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { rspack } from '@rspack/core';
import { SourceMapPlugin } from '../SourceMapPlugin.js';

describe('SourceMapPlugin', () => {
  let workspaceRoot: string;

  beforeEach(() => {
    workspaceRoot = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), 'repack-source-map-plugin-'))
    );
    const files = {
      'apps/app/index.js':
        "import { shared } from '../../packages/shared/index.js'; shared();",
      'packages/shared/index.js': 'export const shared = () => {};',
    };
    for (const [file, content] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(workspaceRoot, file)), {
        recursive: true,
      });
      fs.writeFileSync(path.join(workspaceRoot, file), content);
    }
  });

  afterEach(() => {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('should name sources outside of the context by their resolved absolute path', async () => {
    const outputPath = path.join(workspaceRoot, 'out');
    const compiler = rspack({
      context: path.join(workspaceRoot, 'apps/app'),
      mode: 'development',
      devtool: 'source-map',
      entry: './index.js',
      output: { path: outputPath },
      plugins: [new SourceMapPlugin({ platform: 'ios' })],
    });

    await new Promise<void>((resolve, reject) => {
      compiler.run((error, stats) => {
        compiler.close(() => {});
        if (error) reject(error);
        else if (stats?.hasErrors()) reject(new Error(stats.toString()));
        else resolve();
      });
    });

    const sourceMap = JSON.parse(
      fs.readFileSync(path.join(outputPath, 'main.js.map'), 'utf-8')
    );
    expect(sourceMap.sources).toEqual(
      expect.arrayContaining([
        path.join(workspaceRoot, 'apps/app/index.js'),
        path.join(workspaceRoot, 'packages/shared/index.js'),
      ])
    );
  });
});
