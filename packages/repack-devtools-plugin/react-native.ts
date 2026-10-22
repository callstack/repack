export { createRepackDevToolsRuntimePlugin } from './src/react-native/federation/runtimePlugin';
export type { InstallOptions } from './src/react-native/install';
export { DEV_SERVER_ROUTE, PLUGIN_ID } from './src/shared/constants';
export type * from './src/shared/types';

export let useRepackDevTools: typeof import('./src/react-native/useRepackDevTools').useRepackDevTools;
export let installRepackDevTools: typeof import('./src/react-native/install').installRepackDevTools;

// Same gating as the official Rozenite plugins: in production builds the
// `require`s below are dead code and the exports become no-ops.
declare const lynx: unknown;

const isDev = process.env.NODE_ENV !== 'production';
const isServer = typeof window === 'undefined' && typeof lynx === 'undefined';

if (isDev && !isServer) {
  useRepackDevTools =
    require('./src/react-native/useRepackDevTools').useRepackDevTools;
  installRepackDevTools =
    require('./src/react-native/install').installRepackDevTools;
} else {
  useRepackDevTools = () => undefined;
  installRepackDevTools = () => undefined;
}
