import type { EnvOptions } from '../../types.js';
import { DEFAULT_HOSTNAME, DEFAULT_PORT } from '../consts.js';
import type { Configuration, ConfigurationObject } from '../types.js';

export async function normalizeConfig<C extends ConfigurationObject>(
  config: Configuration<C>,
  env: EnvOptions
): Promise<C> {
  // normalize the config into object
  let configObject: C;
  if (typeof config === 'function') {
    configObject = await config(env, {});
  } else {
    configObject = config;
  }

  // normalize compiler name to be equal to platform
  configObject.name = env.platform;

  // normalize dev server options
  if (env.devServer) {
    configObject.devServer = {
      host: env.devServer.host ?? DEFAULT_HOSTNAME,
      port: env.devServer.port ?? DEFAULT_PORT,
      hot: env.devServer.hmr ?? true,
      ...configObject.devServer,
    };

    configObject.devServer.server = {
      ...(env.devServer.https
        ? {
            type: 'https',
            options: {
              cert: env.devServer.https.cert,
              key: env.devServer.https.key,
              ...configObject.devServer?.server?.options,
            },
          }
        : { type: 'http' as const }),
      ...configObject.devServer?.server,
    };
  }

  // return the normalized config object
  return configObject;
}
