import path from 'path';

interface Options {
  initializeCoreLocation?: string;
  hmr?: boolean;
}

export function getInitializationEntries(
  reactNativePath: string,
  { initializeCoreLocation, hmr }: Options = {}
): string[] {
  const getPolyfills = require(path.join(
    reactNativePath,
    'rn-get-polyfills.js'
  ));

  const entries = [
    ...getPolyfills(),
    initializeCoreLocation ||
      path.join(reactNativePath, 'Libraries/Core/InitializeCore.js'),
  ];

  if (hmr) {
    entries.push(`${require.resolve('../runtime/HMRClient')}?host=[host]`);
  }

  return entries;
}
