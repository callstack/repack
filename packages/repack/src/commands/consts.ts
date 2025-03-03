/** Default development server hostname. */
export const DEFAULT_HOSTNAME = 'localhost';

/** Default development server port. */
export const DEFAULT_PORT = 8081;

/** Default webpack config locations. */
export const DEFAULT_WEBPACK_CONFIG_LOCATIONS = [
  'webpack.config.mjs',
  'webpack.config.cjs',
  'webpack.config.js',
  '.webpack/webpack.config.mjs',
  '.webpack/webpack.config.cjs',
  '.webpack/webpack.config.js',
  '.webpack/webpackfile',
];

/** Default rspack config locations. */
export const DEFAULT_RSPACK_CONFIG_LOCATIONS = [
  'rspack.config.mjs',
  'rspack.config.cjs',
  'rspack.config.js',
];

/**
 * Dev Server supported asset types.
 *
 * These are the types of assets that will be served from the compiler output
 * instead of the local filesystem.
 */
export const DEV_SERVER_ASSET_TYPES = new RegExp(
  [
    '\\.bundle$',
    '\\.map$',
    '\\.hot-update\\.js(on)?$',
    '^assets',
    '^remote-assets',
    // TODO (jbroma): Find a more generic way to handle this
    '^mf-manifest.json$',
    '^@mf-types.zip$',
    '^@mf-types.d.ts$',
  ].join('|')
);

export const DEPENDENCIES_WITH_SEPARATE_PLUGINS: Record<
  string,
  { plugin: string; path: string; bundler?: 'rspack' | 'webpack' }
> = {
  'react-native-reanimated': {
    plugin: 'ReanimatedPlugin',
    path: 'plugin-reanimated',
    bundler: 'rspack',
  },
  nativewind: {
    plugin: 'NativeWindPlugin',
    path: 'plugin-nativewind',
  },
  expo: {
    plugin: 'ExpoModulesPlugin',
    path: 'plugin-expo-modules'
  }
} as const;
