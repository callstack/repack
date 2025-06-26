# Resolver Test Cases

A simple testing framework for Repack's module resolution logic. Tests various edge cases and scenarios from the React Native ecosystem without unnecessary abstractions.

## Philosophy: Simple and Direct

This package follows a "senior engineer" approach:

- **Zero abstractions**: Direct file structure mapping
- **Visible test data**: Everything you need is right in the test
- **Clear intent**: When you read a test, you know exactly what files exist
- **No duplication**: No repeated fields or interface overhead

## Quick Start

```typescript
import { setupTestEnvironment } from "../test-helpers.js";

// Set up packages as simple file structures
const { resolve } = await setupTestEnvironment(
  {
    "my-package": {
      "package.json": JSON.stringify({
        name: "my-package",
        exports: {
          ".": {
            "react-native": "./native.js",
            default: "./web.js",
          },
        },
      }),
      "native.js": 'export const platform = "native";',
      "web.js": 'export const platform = "web";',
    },
  },
  { platform: "ios", enablePackageExports: true }
);

const result = await resolve("my-package");
expect(result).toBe("/node_modules/my-package/native.js");
```

## What You See Is What You Get

When reading a test, you can immediately see:

- What packages exist
- What their `package.json` contains
- What files they have and their content
- No hidden templates or interfaces

```typescript
const { resolve } = await setupTestEnvironment(
  {
    "react-lib": {
      "package.json": JSON.stringify({ name: "react-lib", main: "./index.js" }),
      "index.js": 'export const platform = "web";',
      "index.ios.js": 'export const platform = "ios";',
      "index.android.js": 'export const platform = "android";',
    },
  },
  { platform: "ios" }
);
```

## What's Tested

### Platform Resolution

- Platform-specific files (`.ios.js`, `.android.js`)
- Native fallbacks (`.native.js`)
- TypeScript platform extensions
- `preferNativePlatform` behavior

### Package Exports

- Conditional exports with `react-native` condition
- ESM vs CommonJS resolution differences
- Subpath exports

### Asset Resolution

- Scaled asset handling (@2x, @3x)
- Extension alias behavior

## API

### `setupTestEnvironment(packages, options)`

Creates a virtual filesystem with packages and returns a resolver.

**Parameters:**

- `packages` - Object where keys are package names, values are file structures
- `options` - Resolver options (platform, enablePackageExports, etc.)

**Returns:**

- `resolve(request, context?, dependencyType?)` - Resolve a module request
- `volume` - Direct access to memfs Volume
- `listFiles()` - Debug helper to see all files

## Structure

```
src/
├── test-helpers.ts       # Single helper file with everything
└── __tests__/
    ├── platform-resolution.test.ts
    ├── exports-resolution.test.ts
    └── asset-resolution.test.ts
```

## Why This Approach?

1. **No Interfaces**: Package structure is just `Record<string, Record<string, string>>`
2. **No Duplication**: No repeated name/version fields
3. **Immediate Understanding**: Test setup == actual filesystem structure
4. **Easy Debugging**: `listFiles()` shows exactly what you created
5. **Copy-Paste Friendly**: Easy to copy real package.json content

When a test fails, you know exactly what files exist and what they contain, all visible right in the test.
