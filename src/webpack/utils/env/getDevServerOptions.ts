import { DevServerOptions, Fallback } from '../../../types';
import { getValueFromFallback } from './internal/getValueFromFallback';
import { parseCliOptions } from './internal/parseCliOptions';

/** Default development server (proxy) port. */
export const DEFAULT_PORT = 8081;

export function getDevServerOptions(
  fallback: Fallback<DevServerOptions> = { fallback: { port: DEFAULT_PORT } }
): DevServerOptions {
  const cliOptions = parseCliOptions();
  if (!cliOptions) {
    return getValueFromFallback(fallback);
  }

  if ('bundle' in cliOptions.arguments) {
    return {
      ...getValueFromFallback(fallback),
      enabled: false,
    };
  } else {
    const { host, port, https, cert, key } = cliOptions.arguments.start;
    return {
      enabled: true,
      hmr: true,
      host,
      port: port ?? getValueFromFallback(fallback).port,
      https,
      cert,
      key,
    };
  }
}
