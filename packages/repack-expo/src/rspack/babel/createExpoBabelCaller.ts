import type { ExpoNativePlatform } from '../entry/resolveExpoEntry.js';

export type ExpoBabelCaller = Readonly<{
  asyncRoutes: false;
  baseUrl: '';
  bundler: 'repack';
  engine: 'hermes';
  isDev: boolean;
  isHMREnabled: false;
  isReactServer: false;
  isServer: false;
  name: '@callstack/repack-expo';
  platform: ExpoNativePlatform;
  preserveEnvVars: true;
  projectRoot: string;
  routerRoot: string;
  supportsStaticESM: true;
}>;

type CreateExpoBabelCallerOptions = {
  isDev: boolean;
  platform: ExpoNativePlatform;
  projectRoot: string;
  routerRoot: string;
};

export function createExpoBabelCaller(
  options: CreateExpoBabelCallerOptions
): ExpoBabelCaller {
  return Object.freeze({
    asyncRoutes: false,
    baseUrl: '',
    bundler: 'repack',
    engine: 'hermes',
    isDev: options.isDev,
    isHMREnabled: false,
    isReactServer: false,
    isServer: false,
    name: '@callstack/repack-expo',
    platform: options.platform,
    preserveEnvVars: true,
    projectRoot: options.projectRoot,
    routerRoot: options.routerRoot,
    supportsStaticESM: true,
  });
}
