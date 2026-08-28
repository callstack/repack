import path from 'node:path';
import { resolveProjectPath } from '../resolveProjectPath.js';

describe('resolveProjectPath', () => {
  // The cases below are written with POSIX literals for readability.
  // `resolveProjectPath` returns an absolute, platform-native path, so both the
  // root and the expectation are run through `path.resolve` to give them a
  // drive letter on Windows. Both calls are no-ops on POSIX.
  // Resolving the root matters: without a drive, up-level navigation that
  // reaches the root collapses to a bare "\\", which Windows then reads as the
  // start of a UNC share rather than a local path.
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
