# metro-compat-test

## Description

`metro-compat-test` is a package that uses the test suites from `metro-resolver` to ensure compatibility with `metro`, adapting them to work with `enhanced-resolve`.

## Adherence to metro spec

Some test suites are skipped altogether:

- `assets-test.js` - because `enhanced-resolve`, like node resolution, returns only a single entry, it's impossible to support these test cases. We handle this differently using `AssetResolver` which provides you with first matching entry for development, but all scales are exposed to the runtime.
- `index-test.js` - this suite contains some basic tests & failure tests which we could include but most of it contains tests for unsupported features like:
  - `resolveRequest`
  - `redirectModulePath`
  - `disableHierarchicalLookup`

Some test cases are skipped (all come from `package-exports-test.js`):

- `[nonstrict]` tests are skipped because we don't support fallback in form of legacy file resolution
- asset tests with package exports enabled are skipped because they are handled differently.
- rest of the test skipped are due to inline snapshot not matching up with what `enhanced-resolve` returns

## Updating Tests

To update the tests, copy the latest test suites from the `metro-resolver/src/__tests__` directory in the [metro repository](https://github.com/facebook/metro/tree/main/packages/metro-resolver/src/__tests__) and paste them into `resolver/__tests__` dir.
