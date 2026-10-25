import path from 'node:path';
import { type Compiler, rspack } from '@rspack/core';
import memfs from 'memfs';
import RspackVirtualModulePlugin from 'rspack-plugin-virtual-module';
import webpack from 'webpack';
import { DEFAULT_MANIFEST_FILENAME } from '../federationManifest/types.js';
import { ModuleFederationPluginV1 } from '../ModuleFederationPluginV1.js';

interface CapturedEmission {
  assetExists: boolean;
  source: string | undefined;
  inChunkAuxiliaryFiles: boolean;
}

/**
 * Taps after `RepackFederationManifestPlugin` (registration order) to observe
 * what the emission produced and whether any chunk adopted the asset.
 */
class EmissionCapturePlugin {
  constructor(
    public captured: { current?: CapturedEmission },
    public assetName: string = DEFAULT_MANIFEST_FILENAME
  ) {}

  apply(__compiler: unknown) {
    const compiler = __compiler as Compiler;
    compiler.hooks.compilation.tap('EmissionCapturePlugin', (compilation) => {
      compilation.hooks.afterProcessAssets.tap('EmissionCapturePlugin', () => {
        const asset = compilation.getAsset(this.assetName);
        this.captured.current = {
          assetExists: !!asset,
          source: asset
            ? (asset.source.source() as Buffer | string).toString()
            : undefined,
          inChunkAuxiliaryFiles: [...compilation.chunks].some((chunk) =>
            chunk.auxiliaryFiles?.has(this.assetName)
          ),
        };
      });
    });
  }
}

async function compileWithManifest(
  plugins: Array<{ apply(compiler: Compiler): void }>
) {
  const fileSystem = memfs.createFsFromVolume(new memfs.Volume());

  const compiler = rspack({
    context: __dirname,
    mode: 'production',
    devtool: false,
    entry: 'index.js',
    output: {
      filename: 'index.bundle',
      path: '/out',
      chunkFilename: '[name].chunk.bundle',
    },
    plugins: [
      new RspackVirtualModulePlugin({
        'index.js': "console.log('host');",
      }),
      ...plugins,
    ],
  });

  // @ts-expect-error memfs is compatible enough
  compiler.outputFileSystem = fileSystem;

  await new Promise<void>((resolve, reject) =>
    compiler.run((error, stats) => {
      if (error) return reject(error);
      if (stats?.hasErrors()) return reject(new Error(stats.toString()));
      resolve();
    })
  );

  return fileSystem;
}

describe('federation manifest emission (real compiler)', () => {
  it('emits an intact manifest via rspack without attaching it to any chunk', async () => {
    const captured: { current?: CapturedEmission } = {};

    const fileSystem = await compileWithManifest([
      // react-only shared config: the react-native default would pull flow
      // typed sources into this bare rspack run, which it cannot parse
      new ModuleFederationPluginV1({
        name: 'manifestHost',
        shared: { react: { singleton: true, eager: true } },
        reactNativeDeepImports: false,
        manifest: true,
      }),
      new EmissionCapturePlugin(captured),
    ]);

    expect(captured.current?.assetExists).toBe(true);
    // Chunk-level detachment is what keeps OutputPlugin and
    // AssetsCopyProcessor, which iterate chunk files and auxiliary files,
    // away from the manifest
    expect(captured.current?.inChunkAuxiliaryFiles).toBe(false);

    const onDisk = fileSystem
      .readFileSync(path.join('/out', DEFAULT_MANIFEST_FILENAME), 'utf-8')
      .toString();
    expect(onDisk).toBe(captured.current?.source);

    const manifest = JSON.parse(onDisk);
    expect(manifest).toMatchObject({
      manifestVersion: 1,
      id: 'manifestHost',
      name: 'manifestHost',
      metaData: {
        type: 'host',
        buildInfo: { buildName: 'manifestHost' },
      },
    });
    expect(manifest.metaData.buildInfo.buildVersion).toMatch(
      /^[0-9a-f]{7,40}$|^\d+\.\d+\.\d+$|^unknown$/
    );
    expect(
      manifest.shared.find((entry: { name: string }) => entry.name === 'react')
        .version
    ).toMatch(/^\d+\.\d+\.\d+/);
    expect(manifest.reactNative.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(Array.isArray(manifest.reactNative.nativeModules)).toBe(true);
    expect(manifest.reactNative.platforms).toEqual(['ios', 'android']);
  });

  it('emits nothing when the manifest option is absent', async () => {
    const captured: { current?: CapturedEmission } = {};

    const fileSystem = await compileWithManifest([
      new ModuleFederationPluginV1({
        name: 'manifestHost',
        shared: { react: { singleton: true, eager: true } },
        reactNativeDeepImports: false,
      }),
      new EmissionCapturePlugin(captured),
    ]);

    expect(captured.current?.assetExists).toBe(false);
    expect(
      fileSystem.existsSync(path.join('/out', DEFAULT_MANIFEST_FILENAME))
    ).toBe(false);
  });

  it('emits the manifest with webpack too (bundler-agnostic emit path)', async () => {
    const fileSystem = memfs.createFsFromVolume(new memfs.Volume());
    const captured: { current?: CapturedEmission } = {};

    const compiler = webpack({
      context: __dirname,
      mode: 'production',
      devtool: false,
      entry: path.join(
        __dirname,
        '__fixtures__',
        'manifest-context',
        'entry.js'
      ),
      output: {
        filename: 'index.bundle',
        path: '/out',
      },
      plugins: [
        new ModuleFederationPluginV1({
          name: 'webpackHost',
          shared: { react: { singleton: true, eager: true } },
          reactNativeDeepImports: false,
          manifest: { fileName: 'webpack-federation-manifest.json' },
        }),
        new EmissionCapturePlugin(
          captured,
          'webpack-federation-manifest.json'
        ) as never,
      ],
    });

    // @ts-expect-error memfs is compatible enough
    compiler.outputFileSystem = fileSystem;

    await new Promise<void>((resolve, reject) =>
      compiler.run((error, stats) => {
        if (error) return reject(error);
        if (stats?.hasErrors()) return reject(new Error(stats.toString()));
        resolve();
      })
    );

    expect(captured.current?.assetExists).toBe(true);
    const onDisk = fileSystem
      .readFileSync('/out/webpack-federation-manifest.json', 'utf-8')
      .toString();
    expect(JSON.parse(onDisk)).toMatchObject({
      manifestVersion: 1,
      name: 'webpackHost',
    });
  });
});
