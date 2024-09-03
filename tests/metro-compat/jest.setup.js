const testsToSkip = {
  describe: new Set([
    // unsupported in ehnanced-resolve as well
    '[unsupported] exotic nested arrays',
    // irrelevant in webpack environment
    '@babel/runtime compatibility (special case)',
  ]),
  test: new Set([
    // Non-strict package exports are not supported
    '[nonstrict] should fall back to "main" field resolution when file does not exist',
    '[nonstrict] should fall back to "main" field resolution when "exports" is an invalid subpath',
    '[nonstrict] should fall back to "browser" spec resolution and log inaccessible import warning',
    '[nonstrict] should fall back and log warning for an invalid "exports" target value',
    // Assets are handled differently in webpack
    'should resolve assets using "exports" field and calling `resolveAsset`',
    // Resolving fails as expected but error messages are different
    'should use most specific pattern base',
    'should use most specific pattern base - custom condition',
    'should throw FailedToResolvePathError when no conditions are matched',
  ]),
};

const testsToSkipOnce = {
  describe: new Set(),
  test: new Set([
    // sourceExts are expanded, platform-specific extensions are not
    'without expanding `sourceExts`',
    'without expanding platform-specific extensions',
  ]),
};

// alias it to test
Object.defineProperty(testsToSkip, 'it', testsToSkip.test);
Object.defineProperty(testsToSkipOnce, 'it', testsToSkipOnce.test);

// trap call & check if test should be skipped
const handler = {
  apply(target, _, args) {
    if (testsToSkip[target.name].has(args[0])) {
      return target.skip(...args);
    } else if (testsToSkipOnce[target.name].has(args[0])) {
      testsToSkipOnce[target.name].delete(args[0]);
      return target.skip(...args);
    } else return target(...args);
  },
};

global.describe = new Proxy(global.describe, handler);
global.test = new Proxy(global.test, handler);
global.it = global.test;

// mock imported utils to gain access to __fileMap and __options
jest.doMock('./resolver/__tests__/utils', () => {
  const originalModule = jest.requireActual('./resolver/__tests__/utils');
  return {
    createPackageAccessors(...args) {
      return {
        ...originalModule.createPackageAccessors(...args),
        __fileMapOverrides: args[0],
      };
    },
    createResolutionContext(...args) {
      return {
        ...originalModule.createResolutionContext(...args),
        __fileMap: args[0],
        __options: args[1],
      };
    },
  };
});
