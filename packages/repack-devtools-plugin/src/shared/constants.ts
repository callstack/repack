/** Rozenite plugin id. Agents address its tools as `callstack/repack-devtools`. */
export const PLUGIN_ID = '@callstack/repack-devtools-plugin';

/** Path prefix of the HTTP endpoints added to the dev server by `withRepackDevTools`. */
export const DEV_SERVER_ROUTE = '/repack-devtools';

/** Global the app-side recorders and the MF runtime plugin share state through. */
export const STORE_GLOBAL = '__REPACK_DEVTOOLS_STORE__';

/** Global the bundler-side collector keeps its state in, shared by every platform compiler. */
export const DEV_SERVER_STORE_GLOBAL = '__REPACK_DEVTOOLS_DEV_SERVER_STORE__';

export const LIMITS = {
  scriptEvents: 500,
  federationEvents: 500,
  errors: 100,
  devServerRequests: 300,
  compilationIssues: 50,
  messageLength: 4000,
  responseBodyBytes: 4096,
} as const;
