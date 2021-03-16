import webpack from 'webpack';
import ReactRefreshPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import { WebpackPlugin } from '../../../types';
import { DevServer, DevServerConfig } from '../../../server';

/**
 * {@link DevServerPlugin} configuration options.
 */
export interface DevServerPluginConfig extends DevServerConfig {
  /**
   * Whether Hot Module Replacement / React Refresh should be enabled. Defaults to `true`.
   */
  hmr?: boolean;
}

/**
 * Class for running development server that handles serving the built bundle, all assets as well as
 * providing Hot Module Replacement functionality.
 *
 * @category Webpack Plugin
 */
export class DevServerPlugin implements WebpackPlugin {
  /**
   * Constructs new `DevServerPlugin`.
   *
   * @param config Plugin configuration options. If `undefined`, the development server will be
   * disabled and won't run.
   */
  constructor(private config?: DevServerPluginConfig) {
    if (this.config) {
      this.config.hmr = this.config?.hmr ?? true;
    }
  }

  /**
   * Apply the plugin.
   *
   * @param compiler Webpack compiler instance.
   */
  apply(compiler: webpack.Compiler) {
    const config = this.config;
    if (!config) {
      return;
    }

    const logger = compiler.getInfrastructureLogger('DevServerPlugin');

    // Set public path
    const host = `${config.host || 'localhost'}:${config.port}`;
    compiler.options.output.publicPath = `${
      config.https ? 'https' : 'http'
    }://${host}/`;
    logger.debug('Setting public path to:', compiler.options.output.publicPath);

    new webpack.DefinePlugin({
      'process.env.__PUBLIC_PATH__': JSON.stringify(
        compiler.options.output.publicPath
      ),
      'process.env.__PUBLIC_PORT__': JSON.stringify(config.port),
    }).apply(compiler);

    if (this.config?.hmr) {
      new webpack.HotModuleReplacementPlugin().apply(compiler);
      new ReactRefreshPlugin({
        overlay: false,
      }).apply(compiler);
    }

    let server: DevServer | undefined;

    compiler.hooks.watchRun.tapPromise('DevServerPlugin', async () => {
      if (!server) {
        server = new DevServer(config, compiler);
        await server.run();
      }
    });
  }
}
