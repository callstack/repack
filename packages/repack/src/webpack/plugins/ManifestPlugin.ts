import rspack, { RspackPluginInstance } from '@rspack/core';
import { RawSource } from 'webpack-sources';
/**
 * @category Webpack Plugin
 */

export class ManifestPlugin implements RspackPluginInstance {
  /**
   * Apply the plugin.
   *
   * @param compiler Webpack compiler instance.
   */
  apply(compiler: rspack.Compiler) {
    compiler.hooks.afterCompile.tap('ManifestPlugin', (compilation) => {
      if (!compilation.chunks) {
        return;
      }

      for (const chunk of compilation.chunks) {
        const manifest = {
          id: chunk.id,
          name: chunk.name,
          files: [...chunk.files],
          auxiliaryFiles: [...chunk.auxiliaryFiles],
        };

        if (manifest.files.length) {
          const manifestFile = `${manifest.files[0]}.json`;
          chunk.auxiliaryFiles.push(manifestFile);
          compilation.emitAsset(
            manifestFile,
            new RawSource(JSON.stringify(manifest))
          );
        }
      }
    });
  }
}
