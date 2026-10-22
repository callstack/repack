import { getWebpackContext } from '@callstack/repack/client';
import {
  NativeModules,
  Platform,
  type TurboModule,
  TurboModuleRegistry,
} from 'react-native';
import { getProp, readGlobal, readString } from '../shared/guards';
import type { AppInfo } from '../shared/types';
import type { FederationGlobals } from './federation/state';
import { getStore } from './store';

declare const HermesInternal: unknown;

/**
 * `__webpack_require__`, read as `unknown`: Re.Pack's runtime typings declare
 * `p` as a function, but at runtime it is the public path string, and the MF
 * v1 share scopes (`S`) are not declared at all.
 */
const getWebpackRequire = (): unknown => {
  try {
    return getWebpackContext();
  } catch {
    return undefined;
  }
};

const getPublicPath = () => readString(getWebpackRequire(), 'p');

interface SourceCodeModule extends TurboModule {
  getConstants(): { scriptURL?: string };
}

export const getBundleUrl = (): string | undefined => {
  try {
    const sourceCode =
      TurboModuleRegistry.get<SourceCodeModule>('SourceCode') ??
      NativeModules.SourceCode;
    return (
      sourceCode?.getConstants?.().scriptURL ??
      NativeModules.SourceCode?.scriptURL
    );
  } catch {
    return undefined;
  }
};

const toOrigin = (url: string | undefined) => {
  if (!url || !/^https?:\/\//.test(url)) return undefined;
  const match = /^(https?:\/\/[^/]+)/.exec(url);
  return match?.[1];
};

/**
 * Origin of the dev server that served the running bundle. The webpack public
 * path wins because it is what ScriptManager uses for dev-server chunk URLs;
 * the native bundle URL is the fallback.
 */
export const getDevServerOrigin = (): string | undefined =>
  toOrigin(getPublicPath()) ?? toOrigin(getBundleUrl());

export const getAppInfo = (): AppInfo => {
  const store = getStore();
  const version = Platform.constants.reactNativeVersion;
  return {
    platform: Platform.OS,
    platformVersion: Platform.Version,
    reactNativeVersion: version
      ? [version.major, version.minor, version.patch]
          .join('.')
          .concat(version.prerelease ? `-${version.prerelease}` : '')
      : undefined,
    hermes: typeof HermesInternal !== 'undefined',
    bundleUrl: getBundleUrl(),
    devServer: getDevServerOrigin(),
    publicPath: getPublicPath(),
    installedAt: store.installedAt,
    bootRecording: store.bootRecording,
  };
};

export const getFederationGlobals = (): FederationGlobals => {
  const store = getStore();
  const federation = readGlobal('__FEDERATION__');
  return {
    federation,
    webpackShareScopes: federation
      ? undefined
      : getProp(getWebpackRequire(), 'S'),
    runtimePluginInstalled: store.hooked.runtimePlugin,
    events: store.federationEvents,
  };
};
