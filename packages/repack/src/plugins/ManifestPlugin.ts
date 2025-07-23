import type { Compiler as RspackCompiler } from '@rspack/core';
import type { Compiler as WebpackCompiler } from 'webpack';

/**
 * @category Webpack Plugin
 */
export class ManifestPlugin {
  apply(compiler: RspackCompiler): void;
  apply(compiler: WebpackCompiler): void;

  apply(__compiler: unknown) {
    const compiler = __compiler as RspackCompiler;

    compiler.hooks.compilation.tap('RepackManifestPlugin', (compilation) => {
      compilation.hooks.afterProcessAssets.tap('RepackManifestPlugin', () => {
        for (const chunk of compilation.chunks) {
          const manifest = {
            id: chunk.id,
            name: chunk.name,
            files: [...chunk.files].sort(),
            auxiliaryFiles: [...chunk.auxiliaryFiles].sort(),
          };

          if (manifest.files.length) {
            const manifestFilename = `${manifest.files[0]}.json`;
            compilation.emitAsset(
              manifestFilename,
              new compiler.webpack.sources.RawSource(JSON.stringify(manifest))
            );
          }
        }
      });
    });
  }
}
