# resolver-cases-test

## Description

`resolver-cases-test` is a package that tests Repack's module resolution logic using `enhanced-resolve`. It validates various edge cases and scenarios from the React Native ecosystem using JSON fixtures to define package structures.

## Fixture-Based Approach

Tests use JSON fixtures in `src/__fixtures__/` to define package structures:

```json
{
  "package.json": {
    "name": "my-package",
    "exports": {
      ".": {
        "react-native": "./native.js",
        "default": "./web.js"
      }
    }
  },
  "files": ["native.js", "web.js"]
}
```

## Usage

```ts
import { setupTestEnvironment } from "../test-helpers.js";

const { resolve } = await setupTestEnvironment(["platforms"], {
  platform: "ios",
  enablePackageExports: true,
});

const result = await resolve("platform-specific-lib");
expect(result).toBe("/node_modules/platform-specific-lib/index.ios.js");
```
