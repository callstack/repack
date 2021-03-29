import { CLI_OPTIONS_ENV_KEY } from '../../../env';
import { parseCliOptions } from '../parseCliOptions';

afterEach(() => {
  delete process.env[CLI_OPTIONS_ENV_KEY];
});

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

    describe('on iOS platform', () => {
      it('should return fallback values if CLI options are empty', () => {
        const options = parseCliOptions({ fallback: { platform: 'ios' } });
        expect(options).toMatchSnapshot();
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
              bundleOutput:
                '/x/y/z/DerivedData/TesterApp-xxxxxx/Build/Products/Release-iphonesimulator/main.jsbundle',
              assetsDest:
                '/x/y/z/DerivedData/TesterApp-xxxxxx/Build/Products/Release-iphonesimulator/TesterApp.app',
              entryFile: 'index.js',
              sourcemapOutput: undefined,
              dev: false,
              platform: 'ios',
              minify: true,
            },
          },
        });
        const options = parseCliOptions({ fallback: { platform: 'ios' } });
        expect(options).toMatchSnapshot();
      });
    });

    describe('on Android platform', () => {
      it('should return fallback values if CLI options are empty', () => {
        const options = parseCliOptions({ fallback: { platform: 'android' } });
        expect(options).toMatchSnapshot();
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
              bundleOutput:
                '/x/y/z/build/generated/assets/react/release/index.android.bundle',
              assetsDest: '/x/y/z/build/generated/res/react/release',
              entryFile: 'index.js',
              sourcemapOutput:
                '/x/y/z/build/generated/sourcemaps/react/release/index.android.bundle.map',
              dev: false,
              platform: 'android',
              minify: true,
            },
          },
        });
        const options = parseCliOptions({ fallback: { platform: 'android' } });
        expect(options).toMatchSnapshot();
      });
    });
  });
});
