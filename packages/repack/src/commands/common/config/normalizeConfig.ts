import type { EnvOptions } from '../../../types.js';
import type { Configuration, ConfigurationObject } from '../../types.js';

function normalizeDevServerHost(host?: string): string | undefined {
  switch (host) {
    case 'local-ip':
      return 'localhost';
    case 'local-ipv4':
      return '127.0.0.1';
    case 'local-ipv6':
      return '::1';
    default:
      return host;
  }
}

export async function normalizeConfig<C extends ConfigurationObject>(
  config: Configuration<C>,
  env: EnvOptions
): Promise<C> {
  /* normalize the config into object */
  let configObject: C;
  if (typeof config === 'function') {
    configObject = await config(env, {});
  } else {
    /* shallow copy to avoid mutating the original config */
    configObject = { ...config };
  }

  /* normalize compiler name to be equal to platform */
  configObject.name = env.platform;

  /* normalize dev server host by resolving special values */
  if (configObject.devServer) {
    configObject.devServer.host = normalizeDevServerHost(
      configObject.devServer.host
    );
  }
  /* unset public path if it's using the deprecated `getPublicPath` function */
  if (configObject.output?.publicPath === 'DEPRECATED_GET_PUBLIC_PATH') {
    configObject.output.publicPath = undefined;
  }

  /* return the normalized config object */
  return configObject;
}
