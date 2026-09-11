import path from 'node:path';
import { resolveProjectPath } from '../resolveProjectPath.js';

describe('resolveProjectPath', () => {
  // Cases use POSIX literals; `path.resolve` makes them platform-native.
  // The root must be resolved too: on Windows a drive-less root that walks up
  // to "/" collapses to "\\", which is then parsed as a UNC share.
  const expectResolved = (
    input: string,
    expected: string,
    root = '/project/root'
  ) => {
    expect(resolveProjectPath(input, path.resolve(root))).toBe(
      path.resolve(expected)
    );
  };

  it('should resolve [projectRoot] prefix correctly', () => {
    expectResolved('[projectRoot]/src/index.js', '/project/root/src/index.js');
    expectResolved(
      '[projectRoot]/build/output.js',
      '/apps/my-app/build/output.js',
      '/apps/my-app'
    );
    expectResolved(
      '[projectRoot]/special-file@2x.png',
      '/project/root/special-file@2x.png'
    );
    expectResolved(
      '[projectRoot]/file with spaces.txt',
      '/project/root/file with spaces.txt'
    );
  });

  it('should resolve [projectRoot^N] prefix with up-level navigation', () => {
    expectResolved('[projectRoot^1]/src/index.js', '/project/src/index.js');
    expectResolved('[projectRoot^2]/shared/utils.js', '/shared/utils.js');
    expectResolved('[projectRoot^3]/global/config.json', '/global/config.json');
    expectResolved(
      '[projectRoot^2]/utils/helper.js',
      '/deep/nested/utils/helper.js',
      '/deep/nested/project/folder'
    );
    expectResolved(
      '[projectRoot^5]/very/deep/file.js',
      '/a/very/deep/file.js',
      '/a/b/c/d/e/f'
    );
  });
});
