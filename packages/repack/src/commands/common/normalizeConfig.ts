import type { EnvOptions } from '../../types.js';
import { DEFAULT_HOSTNAME, DEFAULT_PORT } from '../consts.js';
import type { Configuration, ConfigurationObject } from '../types.js';

export async function normalizeConfig<C extends ConfigurationObject>(
  config: Configuration<C>,
  env: EnvOptions
): Promise<C> {
  /* normalize the config into object */
  let configObject: C;
  if (typeof config === 'function') {
    configObject = await config(env, {});
  } else {
    configObject = config;
  }

  /* normalize compiler name to be equal to platform */
  configObject.name = env.platform;

  /* normalize properties where env can override config */
  // fallback to development mode if dev server is enabled
  // otherwise fallback to production mode
  configObject.mode =
    env.mode ??
    configObject.mode ??
    (env.devServer ? 'development' : 'production');

  /* normalize dev server options */
  if (env.devServer) {
    configObject.devServer = {
      ...configObject.devServer,
      host:
        env.devServer.host ?? configObject.devServer?.host ?? DEFAULT_HOSTNAME,
      port: env.devServer.port ?? configObject.devServer?.port ?? DEFAULT_PORT,
      hot: configObject.devServer?.hot ?? true,
    };

    configObject.devServer.server = configObject.devServer.server ?? {
      type: 'http',
    };

    if (env.devServer.https) {
      const serverOptionsFromConfig =
        configObject.devServer.server.options ?? {};

      configObject.devServer.server = {
        type: 'https',
        options: {
          ...serverOptionsFromConfig,
          cert: env.devServer.https.cert,
          key: env.devServer.https.key,
        },
      };
    }
  }

  // return the normalized config object
  return configObject;
}
