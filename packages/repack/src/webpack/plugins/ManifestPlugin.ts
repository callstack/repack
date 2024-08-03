import webpack from 'webpack';
import type { WebpackPlugin } from '../../types';

/**
 * @category Webpack Plugin
 */
export class ManifestPlugin implements WebpackPlugin {
  /**
   * Apply the plugin.
   *
   * @param compiler Webpack compiler instance.
   */
  apply(compiler: webpack.Compiler): void {
    compiler.hooks.compilation.tap('TargetPlugin', (compilation) => {
      compilation.hooks.afterProcessAssets.tap('TargetPlugin', () => {
        for (const chunk of compilation.chunks) {
          const manifest = {
            id: chunk.id,
            name: chunk.name,
            files: [...chunk.files].sort(),
            auxiliaryFiles: [...chunk.auxiliaryFiles].sort(),
          };

          if (manifest.files.length) {
            const manifestFile = `${manifest.files[0]}.json`;
            chunk.auxiliaryFiles.add(manifestFile);
            compilation.emitAsset(
              manifestFile,
              new webpack.sources.RawSource(JSON.stringify(manifest))
            );
          }
        }
      });
    });
  }
}
