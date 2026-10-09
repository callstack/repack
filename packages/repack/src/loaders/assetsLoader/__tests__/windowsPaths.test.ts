import path from 'node:path';
import { convertToRemoteAssets } from '../convertToRemoteAssets.js';
import { extractAssets } from '../extractAssets.js';
import type { Asset } from '../types.js';

// Run the loader helpers with Windows path semantics: `path.join` uses
// backslashes, while `path.posix` stays available as it is on Windows.
jest.mock('node:path', () => {
  const { win32 } = jest.requireActual<typeof import('node:path')>('node:path');
  return { __esModule: true, default: win32, ...win32 };
});

const pathSeparatorRegexp = new RegExp(`\\${path.sep}`, 'g');

const assets: Asset[] = [
  { data: Buffer.from(''), dimensions: null, filename: 'logo.png', scale: 1 },
];

describe('assets loader public paths on Windows', () => {
  it.each([
    [
      'http://localhost:9999',
      'src\\img',
      'http://localhost:9999/assets/src/img',
    ],
    [
      'https://cdn.example.com/assets/',
      'node_modules\\pkg\\img',
      'https://cdn.example.com/assets/assets/node_modules/pkg/img',
    ],
  ])(
    'builds a valid remote URL from %s',
    (remotePublicPath, resourceDirname, expected) => {
      const code = convertToRemoteAssets({
        assets,
        assetsDirname: 'assets',
        remotePublicPath,
        resourceDirname,
        resourceExtensionType: 'png',
        resourceFilename: 'logo',
        resourcePath: 'logo.png',
        suffixPattern: '',
        pathSeparatorRegexp,
      });

      expect(code).toContain(`"httpServerLocation":"${expected}"`);
    }
  );

  it.each([
    [undefined, 'assets/src/img'],
    ['/public', '/public/assets/src/img'],
  ])('joins publicPath %s with forward slashes', (publicPath, expected) => {
    const code = extractAssets(
      {
        resourcePath: 'logo.png',
        resourceDirname: 'src\\img',
        resourceFilename: 'logo',
        resourceExtensionType: 'png',
        assets,
        suffixPattern: '',
        assetsDirname: 'assets',
        pathSeparatorRegexp,
        publicPath,
      },
      { debug: () => {} }
    );

    expect(code).toContain(`httpServerLocation: "${expected}"`);
  });
});
