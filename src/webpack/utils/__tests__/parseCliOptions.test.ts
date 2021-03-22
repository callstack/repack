import { CLI_OPTIONS_ENV_KEY } from '../../../env';
import { parseCliOptions } from '../parseCliOptions';

describe('parseCliOptions', () => {
  describe('for creating static bundle', () => {
    it('should return fallback values if CLI options are empty', () => {
      const options = parseCliOptions({ fallback: { platform: 'xyz' } });
      expect(options).toEqual({
        context: '/a/b/c',
        dev: true,
        mode: 'development',
        minimize: false,
        entry: './index.js',
        outputFilename: 'index.bundle',
        outputPath: '/a/b/c/dist',
        platform: 'xyz',
        reactNativePath: '/a/b/c/node_modules/react-native',
        sourcemapFilename: '[file].map',
      });
    });

    it('should return values based on CLI options - fixture 1', () => {
      process.env[CLI_OPTIONS_ENV_KEY] = JSON.stringify({
        config: {
          root: '/a/b/c',
          reactNativePath: '/a/b/c/node_modules/react-native',
          webpackConfigPath: '/a/b/c/webpack.config.js',
        },
        command: 'bundle',
        arguments: {
          bundle: {
            bundleOutput: '/x/y/z/main.bundle',
            assetsDest: '/x/y/z/app',
            entryFile: '/a/b/c/index.js',
            sourcemapOutput: '/x/y/z/main.bundle.map',
            dev: false,
            platform: 'xyz',
            minify: true,
          },
        },
      });
      const options = parseCliOptions({ fallback: { platform: 'xyz' } });
      expect(options).toEqual({
        context: '/a/b/c',
        dev: false,
        mode: 'production',
        minimize: true,
        entry: '/a/b/c/index.js',
        outputFilename: '../main.bundle',
        outputPath: '/x/y/z/app',
        platform: 'xyz',
        reactNativePath: '/a/b/c/node_modules/react-native',
        sourcemapFilename: '../main.bundle.map',
      });
    });
  });
});
