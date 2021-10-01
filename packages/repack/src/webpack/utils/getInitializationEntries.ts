import path from 'path';

/**
 * {@link getInitializationEntries} options.
 */
export interface InitializationEntriesOptions {
  /**
   * Absolute location to JS file with initialization logic for React Native.
   * Useful if you want to built for out-of-tree platforms.
   */
  initializeCoreLocation?: string;
  /**
   * Whether Hot Module Replacement entry should be enabled. Defaults to `true`.
   */
  hmr?: boolean;
}

/**
 * Get setup and initialization entires for Webpack configuration's `entry` field.
 * The returned entires should be added before your project entry.
 *
 * @param reactNativePath Absolute path to directory with React Native dependency.
 * @param options Additional options that can modify returned entires.
 * @returns Array of entires.
 *
 * @category Webpack util
 */
export function getInitializationEntries(
  reactNativePath: string,
  options: InitializationEntriesOptions = {}
): string[] {
  const { initializeCoreLocation, hmr } = options;

  const getPolyfills = require(path.join(
    reactNativePath,
    'rn-get-polyfills.js'
  ));

  const entries = [
    ...getPolyfills(),
    initializeCoreLocation ||
      path.join(reactNativePath, 'Libraries/Core/InitializeCore.js'),
    require.resolve('../../client/setup/setupRepack'),
  ];

  if (hmr) {
    entries.push(
      require.resolve('../../client/setup/modules/WebpackHMRClient')
    );
  }

  return entries;
}
