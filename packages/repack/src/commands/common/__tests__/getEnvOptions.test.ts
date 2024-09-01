import { getEnvOptions } from '../../common';

describe('getEnvOptions', () => {
  it('should return options for bundling', () => {
    expect(
      getEnvOptions({
        config: {
          root: '/x/y/z',
          reactNativePath: '/x/y/z/node_modules/react-native',
          webpackConfigPath: '/x/y/z/webpack.config.js',
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
      minimize: true,
      mode: 'production',
      platform: 'android',
      reactNativePath: '/x/y/z/node_modules/react-native',
      bundleFilename: '/a/b/c/main.js',
    });

    expect(
      getEnvOptions({
        config: {
          root: '/x/y/z',
          reactNativePath: '/x/y/z/node_modules/react-native',
          webpackConfigPath: '/x/y/z/webpack.config.js',
        },
        command: 'bundle',
        arguments: {
          bundle: {
            platform: 'android',
            dev: true,
            bundleOutput: '/a/b/c/main.js',
            entryFile: '/x/y/z/src/main.js',
          },
        },
      })
    ).toEqual({
      context: '/x/y/z',
      entry: '/x/y/z/src/main.js',
      minimize: false,
      mode: 'development',
      platform: 'android',
      reactNativePath: '/x/y/z/node_modules/react-native',
      bundleFilename: '/a/b/c/main.js',
    });
  });

  it('should return options for developing', () => {
    expect(
      getEnvOptions({
        config: {
          root: '/x/y/z',
          reactNativePath: '/x/y/z/node_modules/react-native',
          webpackConfigPath: '/x/y/z/webpack.config.js',
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
      mode: 'development',
      reactNativePath: '/x/y/z/node_modules/react-native',
      devServer: {
        hmr: true,
        port: 8081,
        host: 'localhost',
      },
      bundleFilename: '',
    });

    expect(
      getEnvOptions({
        config: {
          root: '/x/y/z',
          reactNativePath: '/x/y/z/node_modules/react-native',
          webpackConfigPath: '/x/y/z/webpack.config.js',
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
      mode: 'development',
      reactNativePath: '/x/y/z/node_modules/react-native',
      devServer: {
        hmr: true,
        port: 5000,
        host: 'local',
      },
      bundleFilename: '',
    });
  });
});
