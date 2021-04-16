import { DevServerOptions, Fallback } from '../../../types';
import { getFallbackFromOptions } from './internal/getFallbackFromOptions';
import { parseCliOptions } from './internal/parseCliOptions';

/** Default development server (proxy) port. */
export const DEFAULT_PORT = 8081;

type DeepOptional<T> = T extends { [key: string]: any }
  ? {
      [K in keyof T]?: DeepOptional<T[K]>;
    }
  : T | undefined;

export function getDevServerOptions(
  options: Fallback<DeepOptional<DevServerOptions>> = {
    fallback: { port: DEFAULT_PORT },
  }
): DevServerOptions {
  const cliOptions = parseCliOptions();
  if (!cliOptions) {
    return {
      port: DEFAULT_PORT,
      ...getFallbackFromOptions(options),
    };
  }

  if ('bundle' in cliOptions.arguments) {
    return {
      port: DEFAULT_PORT,
      enabled: false,
      ...getFallbackFromOptions(options),
    };
  } else {
    const { host, port, https, cert, key } = cliOptions.arguments.start;
    return {
      enabled: true,
      hmr: getFallbackFromOptions(options).hmr ?? true,
      host,
      port: port ?? getFallbackFromOptions(options).port ?? DEFAULT_PORT,
      https,
      cert,
      key,
    };
  }
}
