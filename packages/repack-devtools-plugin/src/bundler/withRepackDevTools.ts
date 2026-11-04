import { RepackDevToolsCollectorPlugin } from './collector.js';
import {
  createFaultMiddleware,
  createRequestLogMiddleware,
  createStateMiddleware,
} from './middleware.js';
import { getDevServerStore } from './store.js';

type EnvLike = {
  platform?: string;
  devServer?: { port?: number } | false;
};

type SetupMiddlewares = (
  middlewares: unknown[],
  devServer: unknown
) => unknown[];

type ConfigLike = {
  plugins?: unknown[];
  devServer?: { setupMiddlewares?: SetupMiddlewares; [key: string]: unknown };
};

type ConfigExport<TConfig, TEnv> =
  | TConfig
  | ((env: TEnv) => TConfig | Promise<TConfig>);

export type RepackDevToolsOptions = {
  /** Defaults to `true`. Pass e.g. `process.env.WITH_ROZENITE === 'true'`. */
  enabled?: boolean;
};

const isDevToolsMiddleware = (middleware: unknown) =>
  typeof middleware === 'function' &&
  '__repackDevTools' in middleware &&
  middleware.__repackDevTools === true;

/**
 * Adds the devtools compilation collector and the `/repack-devtools/*`
 * dev-server endpoints to a Re.Pack (Rspack or webpack) config. Only applies
 * when the config is evaluated for the dev server (`start`), never for
 * `bundle`.
 */
export const withRepackDevTools = <
  TConfig extends ConfigLike,
  TEnv extends EnvLike,
>(
  config: ConfigExport<TConfig, TEnv>,
  options: RepackDevToolsOptions = {}
): ConfigExport<TConfig, TEnv> => {
  if (options.enabled === false) return config;

  return async (env: TEnv) => {
    const resolved = typeof config === 'function' ? await config(env) : config;
    if (!env.devServer) return resolved;

    const store = getDevServerStore();
    store.port = env.devServer.port ?? store.port;
    const userSetupMiddlewares = resolved.devServer?.setupMiddlewares;

    return {
      ...resolved,
      plugins: [
        ...(resolved.plugins ?? []),
        new RepackDevToolsCollectorPlugin({
          platform: env.platform ?? 'unknown',
        }),
      ],
      devServer: {
        ...resolved.devServer,
        setupMiddlewares: (middlewares: unknown[], devServer: unknown) => {
          const result = userSetupMiddlewares
            ? userSetupMiddlewares.call(
                resolved.devServer,
                middlewares,
                devServer
              )
            : middlewares;
          if (!result.some(isDevToolsMiddleware)) {
            result.unshift(
              createStateMiddleware(),
              createRequestLogMiddleware(),
              createFaultMiddleware()
            );
          }
          return result;
        },
      },
    };
  };
};
