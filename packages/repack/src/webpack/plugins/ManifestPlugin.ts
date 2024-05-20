import rspack, { RspackPluginInstance } from '@rspack/core';

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
    throw new Error('Not implemented yet');
    // compiler.hooks.compilation.tap('TargetPlugin', (compilation) => {
    //   compilation.hooks.afterProcessAssets.tap('TargetPlugin', () => {
    //     for (const chunk of compilation.chunks) {
    //       const manifest = {
    //         id: chunk.id,
    //         name: chunk.name,
    //         files: [...chunk.files].sort(),
    //         auxiliaryFiles: [...chunk.auxiliaryFiles].sort(),
    //       };

    //       if (manifest.files.length) {
    //         TODO Fix this - right now adding to auxiliaryFiles is not supported
    //         const manifestFile = `${manifest.files[0]}.json`;
    //         chunk.auxiliaryFiles.add(manifestFile);
    //         compilation.emitAsset(
    //           manifestFile,
    //           new rspack.sources.RawSource(JSON.stringify(manifest))
    //         );
    //       }
    //     }
    //   });
    // });
  }
}
