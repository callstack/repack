const testsToSkip = {
  describe: new Set([
    // unsupported in ehnanced-resolve as well
    '[unsupported] exotic nested arrays',
  ]),
  test: new Set([
    // Non-strict package exports are not supported
    '[nonstrict] should fall back to "main" field resolution when file does not exist',
    '[nonstrict] should fall back to "main" field resolution when "exports" is an invalid subpath',
    '[nonstrict] should fall back to "browser" spec resolution and log inaccessible import warning',
    '[nonstrict] should fall back and log warning for an invalid "exports" target value',
    '[nonstrict] should fall back to "browser" spec resolution and log inaccessible import warning',
    '[nonstrict] should fall back to "browser" spec resolution and log inaccessible import warning',
    // Assets are handled differently in webpack
    'should resolve assets using "exports" field and calling `resolveAsset`',
  ]),
};

// alias it to test
Object.defineProperty(testsToSkip, 'it', testsToSkip.test);

// trap call & check if test should be skipped
const handler = {
  apply(target, _, args) {
    if (testsToSkip[target.name].has(args[0])) {
      return target.skip(...args);
    } else return target(...args);
  },
};

global.describe = new Proxy(global.describe, handler);
global.test = new Proxy(global.test, handler);
global.it = global.test;
