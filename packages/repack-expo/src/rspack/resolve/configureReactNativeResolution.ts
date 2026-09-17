import path from 'node:path';
import type { ResolveAlias } from '@rspack/core';
import { ExpoPluginError } from '../ExpoPluginError.js';

type PackageResolver = (
  request: string,
  options: { paths: string[] }
) => string;

export function configureReactNativeResolution(
  alias: ResolveAlias | undefined,
  projectRoot: string,
  resolvePackage: PackageResolver = require.resolve
): ResolveAlias {
  let reactNativeRoot: string;
  let assetsRegistryRoot: string;

  try {
    reactNativeRoot = path.dirname(
      resolvePackage('react-native/package.json', { paths: [projectRoot] })
    );
    assetsRegistryRoot = path.dirname(
      resolvePackage('@react-native/assets-registry/package.json', {
        paths: [reactNativeRoot],
      })
    );
  } catch {
    throw new ExpoPluginError({
      code: 'REACT_NATIVE_RESOLUTION_FAILED',
      message: `ExpoPlugin could not resolve the application's React Native runtime from ${projectRoot}.`,
      recovery:
        'Install react-native and @react-native/assets-registry for the Expo SDK, then reinstall dependencies.',
    });
  }

  return {
    'react-native': reactNativeRoot,
    '@react-native/assets-registry': assetsRegistryRoot,
    ...(alias ?? {}),
  };
}
