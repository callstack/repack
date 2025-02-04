import { getEnvOptions } from '../../common/index.js';

describe('getEnvOptions', () => {
  it('should return options for bundling', () => {
    expect(
      getEnvOptions({
        config: {
          root: '/x/y/z',
          platforms: ['ios', 'android'],
          bundlerConfigPath: '/x/y/z/webpack.config.js',
          reactNativePath: '/x/y/z/node_modules/react-native',
        },
        command: 'bundle',
        arguments: {
          bundle: {
            platform: 'android',
            dev: false,
            bundleOutput: '/a/b/c/main.js',
            entryFile: 'main.js',
          },
        },
      })
    ).toEqual({
      context: '/x/y/z',
      entry: './main.js',
      minimize: undefined,
      mode: 'production',
      platform: 'android',
      reactNativePath: '/x/y/z/node_modules/react-native',
      bundleFilename: '/a/b/c/main.js',
      sourceMapFilename: undefined,
      assetsPath: undefined,
    });

    expect(
      getEnvOptions({
        config: {
          root: '/x/y/z',
          platforms: ['ios', 'android'],
          bundlerConfigPath: '/x/y/z/webpack.config.js',
          reactNativePath: '/x/y/z/node_modules/react-native',
        },
        command: 'bundle',
        arguments: {
          bundle: {
            platform: 'android',
            dev: true,
            bundleOutput: '/a/b/c/main.js',
            sourcemapOutput: '/a/b/c/main.js.map',
            assetsDest: '/a/b/c/assets',
            entryFile: '/x/y/z/src/main.js',
          },
        },
      })
    ).toEqual({
      context: '/x/y/z',
      entry: '/x/y/z/src/main.js',
      minimize: undefined,
      mode: 'development',
      platform: 'android',
      reactNativePath: '/x/y/z/node_modules/react-native',
      bundleFilename: '/a/b/c/main.js',
      sourceMapFilename: '/a/b/c/main.js.map',
      assetsPath: '/a/b/c/assets',
    });
  });

  it('should return options for developing', () => {
    expect(
      getEnvOptions({
        config: {
          root: '/x/y/z',
          platforms: ['ios', 'android'],
          bundlerConfigPath: '/x/y/z/webpack.config.js',
          reactNativePath: '/x/y/z/node_modules/react-native',
        },
        command: 'start',
        arguments: {
          start: {
            host: 'localhost',
          },
        },
      })
    ).toEqual({
      context: '/x/y/z',
      reactNativePath: '/x/y/z/node_modules/react-native',
      devServer: {
        host: 'localhost',
        port: undefined,
        hmr: true,
        https: undefined,
      },
    });

    expect(
      getEnvOptions({
        config: {
          root: '/x/y/z',
          platforms: ['ios', 'android'],
          bundlerConfigPath: '/x/y/z/webpack.config.js',
          reactNativePath: '/x/y/z/node_modules/react-native',
        },
        command: 'start',
        arguments: {
          start: {
            port: 5000,
            host: 'local',
          },
        },
      })
    ).toEqual({
      context: '/x/y/z',
      reactNativePath: '/x/y/z/node_modules/react-native',
      devServer: {
        host: 'local',
        port: 5000,
        hmr: true,
        https: undefined,
      },
    });
  });
});
