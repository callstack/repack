import { rspack } from '@rspack/core';
import memfs from 'memfs';
import RspackVirtualModulePlugin from 'rspack-plugin-virtual-module';

import { SentryDebugIdPlugin } from '../SentryDebugIdPlugin.js';

const DEBUG_ID_REGEX =
  /_sentryDebugIdIdentifier\s*=\s*"sentry-dbid-([0-9a-f-]{36})"/;

async function compileBundle(outputFilename: string) {
  const fileSystem = memfs.createFsFromVolume(new memfs.Volume());

  const compiler = rspack({
    context: __dirname,
    mode: 'production',
    devtool: 'source-map',
    entry: 'index.js',
    output: {
      filename: outputFilename,
      path: '/out',
    },
    plugins: [
      new SentryDebugIdPlugin(),
      new RspackVirtualModulePlugin({
        'index.js': "console.log('hello');",
      }),
    ],
  });

  // @ts-expect-error memfs is compatible enough for the compiler's output filesystem
  compiler.outputFileSystem = fileSystem;

  return new Promise<{ bundle: string; sourceMap: string }>(
    (resolve, reject) => {
      compiler.run((error) => {
        if (error) {
          reject(error);
          return;
        }
        compiler.close(() => {
          resolve({
            bundle: fileSystem
              .readFileSync(`/out/${outputFilename}`, 'utf-8')
              .toString(),
            sourceMap: fileSystem
              .readFileSync(`/out/${outputFilename}.map`, 'utf-8')
              .toString(),
          });
        });
      });
    }
  );
}

describe('SentryDebugIdPlugin', () => {
  it('injects a Debug ID into the bundle and its source map', async () => {
    const { bundle, sourceMap } = await compileBundle('index.bundle');

    const injected = bundle.match(DEBUG_ID_REGEX);
    expect(injected).not.toBeNull();

    const parsedSourceMap = JSON.parse(sourceMap);
    expect(parsedSourceMap.debugId).toBe(injected?.[1]);
    expect(parsedSourceMap.debug_id).toBe(injected?.[1]);
  });

  it('injects a Debug ID for bundles with a .js extension', async () => {
    const { bundle, sourceMap } = await compileBundle('index.js');

    const injected = bundle.match(DEBUG_ID_REGEX);
    expect(injected).not.toBeNull();
    expect(JSON.parse(sourceMap).debugId).toBe(injected?.[1]);
  });
});
