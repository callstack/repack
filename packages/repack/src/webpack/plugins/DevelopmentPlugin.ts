import rspack, { RspackPluginInstance } from '@rspack/core';
import RspackReactRefreshPlugin from '@rspack/plugin-react-refresh';
import type { DevServerOptions } from '../../types';

/**
 * {@link DevelopmentPlugin} configuration options.
 */
export interface DevelopmentPluginConfig {
  platform: string;
  devServer?: DevServerOptions;
  entryName?: string | null;
}

/**
 * Class for running development server that handles serving the built bundle, all assets as well as
 * providing Hot Module Replacement functionality.
 *
 * @category Webpack Plugin
 */
export class DevelopmentPlugin implements RspackPluginInstance {
  /**
   * Constructs new `DevelopmentPlugin`.
   *
   * @param config Plugin configuration options.
   */
  constructor(private config?: DevelopmentPluginConfig) {}

  /**
   * Apply the plugin.
   *
   * @param compiler Webpack compiler instance.
   */
  apply(compiler: rspack.Compiler) {
    if (!this.config?.devServer) {
      return;
    }

    new rspack.DefinePlugin({
      __PUBLIC_PORT__: JSON.stringify(this.config.devServer.port),
      __PLATFORM__: JSON.stringify(this.config.platform),
    }).apply(compiler);

    if (this.config?.devServer.hmr) {
      // TODO Align this with output.hotModuleUpdateChunkFilename?
      // setup HMR source maps
      new rspack.SourceMapDevToolPlugin({
        test: /\.hot-update\.js$/,
        filename: '[file].map',
        append: `//# sourceMappingURL=[url]?platform=${this.config.platform}`,
        module: true,
        columns: true,
        noSources: false,
      }).apply(compiler);

      // setup HMR
      new rspack.HotModuleReplacementPlugin().apply(compiler);
      // @ts-ignore
      new RspackReactRefreshPlugin().apply(compiler);

      new rspack.EntryPlugin(
        compiler.context,
        require.resolve('../../modules/WebpackHMRClient'),
        { name: undefined }
      ).apply(compiler);
      // TODO Bring back lazy compilation when it's implemented in rspack
    }
  }
}
