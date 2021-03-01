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
    const host = `${config.host || 'localhost'}:${config.port}`;
    compiler.options.output.publicPath = `${
      config.https ? 'https' : 'http'
    }://${host}/`;
    logger.debug('Setting public path to:', compiler.options.output.publicPath);

    if (typeof compiler.options.entry !== 'function') {
      for (const entryKey in compiler.options.entry) {
        compiler.options.entry[entryKey].import = compiler.options.entry[
          entryKey
        ].import?.map((value) => {
          if (/HMRClient\.js\?host=\[host\]/.test(value)) {
            return value.replace('[host]', host);
          }
          return value;
        });
      }
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
