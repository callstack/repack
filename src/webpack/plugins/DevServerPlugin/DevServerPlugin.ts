import webpack from 'webpack';
import { WebpackPlugin } from '../../../types';
import { DevServer, DevServerConfig } from './DevServer';

interface DevServerPluginConfig extends DevServerConfig {}

export class DevServerPlugin implements WebpackPlugin {
  constructor(private config?: DevServerPluginConfig) {}

  apply(compiler: webpack.Compiler) {
    const config = this.config;
    if (!config) {
      return;
    }

    const logger = compiler.getInfrastructureLogger('DevServerPlugin');

    // Set public path
    compiler.options.output.publicPath = `${
      config.https ? 'https' : 'http'
    }://${config.host || 'localhost'}:${config.port}`;
    logger.debug('Setting public path to:', compiler.options.output.publicPath);

    compiler.hooks.watchRun.tap('DevServerPlugin', () => {
      const server = new DevServer(config, compiler);
      server.run();
    });

    // TODO: add hooks to compiler to support HMR/React Refresh
  }
}
