import path from 'path';

interface Options {
  initializeCoreLocation?: string;
}

export function getInitializationEntries(
  reactNativePath: string,
  { initializeCoreLocation }: Options = {}
): string[] {
  const getPolyfills = require(path.join(
    reactNativePath,
    'rn-get-polyfills.js'
  ));

  return [
    ...getPolyfills(),
    initializeCoreLocation ||
      path.join(reactNativePath, 'Libraries/Core/InitializeCore.js'),
  ];
}
