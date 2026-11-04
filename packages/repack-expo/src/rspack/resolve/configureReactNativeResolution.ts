import fs from 'node:fs';
import path from 'node:path';
import type { ResolveAlias } from '@rspack/core';
import { ExpoPluginError } from '../ExpoPluginError.js';

type PackageResolver = (
  request: string,
  options: { paths: string[] }
) => string;

const ASSETS_REGISTRY = '@react-native/assets-registry';

// React Native 0.87 and newer no longer depend on the assets registry package.
// Only alias it when the application's React Native declares it, so a copy
// hoisted for another React Native version is never picked up.
function dependsOnAssetsRegistry(reactNativePackageJson: string): boolean {
  const { dependencies } = JSON.parse(
    fs.readFileSync(reactNativePackageJson, 'utf8')
  ) as { dependencies?: Record<string, string> };

  return Boolean(dependencies?.[ASSETS_REGISTRY]);
}

export function configureReactNativeResolution(
  alias: ResolveAlias | undefined,
  projectRoot: string,
  resolvePackage: PackageResolver = require.resolve
): ResolveAlias {
  let reactNativeRoot: string;
  let assetsRegistryRoot: string | undefined;

  try {
    const reactNativePackageJson = resolvePackage('react-native/package.json', {
      paths: [projectRoot],
    });

    reactNativeRoot = path.dirname(reactNativePackageJson);

    if (dependsOnAssetsRegistry(reactNativePackageJson)) {
      assetsRegistryRoot = path.dirname(
        resolvePackage(`${ASSETS_REGISTRY}/package.json`, {
          paths: [reactNativeRoot],
        })
      );
    }
  } catch {
    throw new ExpoPluginError({
      code: 'REACT_NATIVE_RESOLUTION_FAILED',
      message: `ExpoPlugin could not resolve the application's React Native runtime from ${projectRoot}.`,
      recovery: `Install react-native for the Expo SDK, then reinstall dependencies. React Native 0.86 and earlier also need ${ASSETS_REGISTRY}.`,
    });
  }

  return {
    'react-native': reactNativeRoot,
    ...(assetsRegistryRoot && { [ASSETS_REGISTRY]: assetsRegistryRoot }),
    ...(alias ?? {}),
  };
}
