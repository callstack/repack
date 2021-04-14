import { CLI_OPTIONS_ENV_KEY } from '../../../../env';
import { getReactNativePath } from '../getReactNativePath';

describe('getReactNativePath', () => {
  beforeEach(() => {
    delete process.env[CLI_OPTIONS_ENV_KEY];
  });

  it('should return fallback value', () => {
    expect(getReactNativePath()).toEqual(require.resolve('react-native'));
    expect(getReactNativePath({ fallback: '/path/to/react-native' })).toEqual(
      '/path/to/react-native'
    );
  });

  it('should return value from CLI options', () => {
    process.env[CLI_OPTIONS_ENV_KEY] = JSON.stringify({
      config: {
        reactNativePath: '/x/y/z/react-native',
      },
    });

    expect(getReactNativePath()).toEqual('/x/y/z/react-native');
  });
});
