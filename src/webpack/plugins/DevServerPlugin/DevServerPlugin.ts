import webpack from 'webpack';
import { WebpackPlugin } from '../../../types';
import { DevServer, DevServerConfig } from '../../../server';

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

    // TODO: inject hmr entry with platform-specific compiler's port

    let server: DevServer | undefined;

    compiler.hooks.watchRun.tapPromise('DevServerPlugin', async () => {
      if (!server) {
        server = new DevServer(config, compiler);
        await server.run();
      }
    });

    // TODO: add hooks to compiler to support HMR/React Refresh
  }
}
