import rspack, { RspackPluginInstance } from '@rspack/core';
import RspackReactRefreshPlugin from '@rspack/plugin-react-refresh';
import type { DevServerOptions } from '../../types';

type PackageJSON = { version: string };
/**
 * {@link DevelopmentPlugin} configuration options.
 */
export interface DevelopmentPluginConfig {
  platform: string;
  devServer?: DevServerOptions;
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

    const reactNativePackageJson: PackageJSON = require('react-native/package.json');
    const [majorVersion, minorVersion, patchVersion] =
      reactNativePackageJson.version.split('-')[0].split('.');

    new rspack.DefinePlugin({
      __PLATFORM__: JSON.stringify(this.config.platform),
      __PUBLIC_PORT__: Number(this.config.devServer.port),
      __REACT_NATIVE_MAJOR_VERSION__: Number(majorVersion),
      __REACT_NATIVE_MINOR_VERSION__: Number(minorVersion),
      __REACT_NATIVE_PATCH_VERSION__: Number(patchVersion),
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
      new RspackReactRefreshPlugin().apply(compiler);

      new rspack.EntryPlugin(
        compiler.context,
        require.resolve('../../modules/configurePublicPath'),
        { name: undefined }
      );

      new rspack.EntryPlugin(
        compiler.context,
        require.resolve('../../modules/WebpackHMRClient'),
        { name: undefined }
      ).apply(compiler);

      // TODO Bring back lazy compilation when it's implemented in rspack
    }
  }
}
