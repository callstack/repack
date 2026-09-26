import { parseUrl } from '../parseUrl.js';

describe('parseUrl', () => {
  const expectParsed = (
    url: string,
    expected: { resourcePath: string; platform?: string },
    platformList = ['ios', 'android', 'web']
  ) => {
    expect(parseUrl(url, platformList)).toEqual(expected);
  };

  it('should parse URLs with platform from query parameters', () => {
    expectParsed('src/index.js?platform=ios', {
      resourcePath: 'src/index.js',
      platform: 'ios',
    });
    expectParsed('components/Button.tsx?platform=android', {
      resourcePath: 'components/Button.tsx',
      platform: 'android',
    });
    expectParsed('/absolute/path/file.js?platform=web', {
      resourcePath: 'absolute/path/file.js',
      platform: 'web',
    });
  });

  it('should parse URLs with platform from pathname', () => {
    expectParsed('/ios/src/index.js', {
      resourcePath: 'src/index.js',
      platform: 'ios',
    });
    expectParsed('/android/components/Button.tsx', {
      resourcePath: 'components/Button.tsx',
      platform: 'android',
    });
    expectParsed('/web/utils/helper.js', {
      resourcePath: 'utils/helper.js',
      platform: 'web',
    });
  });

  it('should parse URLs with platform from file extension', () => {
    expectParsed('src/index.ios.js', {
      resourcePath: 'src/index.ios.js',
      platform: 'ios',
    });
    expectParsed('components/Button.android.tsx', {
      resourcePath: 'components/Button.android.tsx',
      platform: 'android',
    });
    expectParsed('styles/theme.web.css', {
      resourcePath: 'styles/theme.web.css',
      platform: 'web',
    });
  });

  it('should handle URLs without platform detection', () => {
    expectParsed('src/index.js', {
      resourcePath: 'src/index.js',
      platform: undefined,
    });
    expectParsed('/components/Button.tsx', {
      resourcePath: 'components/Button.tsx',
      platform: undefined,
    });
    expectParsed('utils/helper.unknown.js', {
      resourcePath: 'utils/helper.unknown.js',
      platform: undefined,
    });
  });

  it('should prioritize query parameter over pathname and extension', () => {
    expectParsed('/android/src/index.ios.js?platform=web', {
      resourcePath: 'android/src/index.ios.js',
      platform: 'web',
    });
    expectParsed('/ios/components/Button.android.tsx?platform=web', {
      resourcePath: 'ios/components/Button.android.tsx',
      platform: 'web',
    });
  });

  it('should return the decoded path', () => {
    // Symbolicated stack frames are passed as file names, not URLs.
    expectParsed('[projectRoot^2]/node_modules/pkg/index.js', {
      resourcePath: '[projectRoot^2]/node_modules/pkg/index.js',
      platform: undefined,
    });
    expectParsed('[projectRoot]/src/Home Screen.tsx', {
      resourcePath: '[projectRoot]/src/Home Screen.tsx',
      platform: undefined,
    });
    expectParsed('[projectRoot]/src/Écran.ios.tsx', {
      resourcePath: '[projectRoot]/src/Écran.ios.tsx',
      platform: 'ios',
    });
    // Request URLs arrive percent-encoded.
    expectParsed('/assets/src/caret%5Edir/image.png?platform=ios', {
      resourcePath: 'assets/src/caret^dir/image.png',
      platform: 'ios',
    });
  });

  it('should keep a path that is not a valid escape sequence', () => {
    expectParsed('assets/100%.png?platform=ios', {
      resourcePath: 'assets/100%.png',
      platform: 'ios',
    });
  });

  it('should work with different platform lists', () => {
    expectParsed(
      '/react-native/src/index.js',
      {
        resourcePath: 'src/index.js',
        platform: 'react-native',
      },
      ['react-native', 'macos']
    );
    expectParsed(
      'app.macos.js',
      {
        resourcePath: 'app.macos.js',
        platform: 'macos',
      },
      ['react-native', 'macos']
    );
  });
});
