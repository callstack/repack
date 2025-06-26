# Resolver Test Cases

This package provides a testing framework for Repack's module resolution logic. It allows testing various edge cases and scenarios that packages in the React Native ecosystem might present.

## Features

- **Virtual File System**: Test resolution without creating real files using `memfs`
- **Repack Integration**: Uses `getResolveOptions` from Repack with `enhanced-resolve`
- **Platform-specific Resolution**: Test iOS, Android, and web platform file resolution
- **Package Exports Support**: Test modern package.json `exports` field resolution
- **Asset Resolution**: Test resolution of scaled assets (@2x, @3x)
- **TypeScript Support**: Full TypeScript support with proper types

## Architecture

### Core Components

- **VirtualFileSystem**: Creates in-memory filesystems for testing
- **RepackResolver**: Bridges Repack's resolve options with enhanced-resolve
- **Package Templates**: Predefined package structures for common patterns
- **Test Utilities**: Helper functions for setting up test environments

### Bridging byDependency

Since `enhanced-resolve` doesn't support Webpack's `byDependency` option directly, this package merges dependency-specific condition names into the main resolver configuration.

## Usage

```typescript
import {
  setupTestEnvironment,
  resolveFromApp,
} from "./src/test-utils/setup.js";
import { reactStrictDomTemplate } from "./src/utils/package-templates.js";

// Set up a test environment with a virtual package
const context = await setupTestEnvironment(
  [{ name: "react-strict-dom", package: reactStrictDomTemplate }],
  { platform: "ios", enablePackageExports: true }
);

// Test resolution
const result = await resolveFromApp(context, "react-strict-dom");
expect(result).toBe("/node_modules/react-strict-dom/dist/native/index.js");
```

## Test Categories

### Platform Resolution

- iOS/Android platform-specific files (`.ios.js`, `.android.js`)
- Native fallbacks (`.native.js`)
- TypeScript platform extensions (`.ios.ts`, `.android.ts`)

### Package Exports

- Conditional exports with `react-native` condition
- ESM vs CommonJS resolution
- Subpath exports

### Asset Resolution

- Scaled asset resolution (@2x, @3x)
- Different asset formats (PNG, JPG, MP4)

## Running Tests

```bash
pnpm test
```

For watch mode:

```bash
pnpm test:watch
```

## Adding New Test Cases

1. **Create Package Template**: Add new templates to `src/utils/package-templates.ts`
2. **Write Tests**: Create test files in `src/__tests__/`
3. **Use Test Utilities**: Leverage `setupTestEnvironment` and `resolveFromApp` helpers

## Package Templates

The package includes several predefined templates representing common patterns:

- **reactStrictDomTemplate**: React Strict DOM with conditional exports
- **platformSpecificTemplate**: Traditional platform-specific files
- **typescriptPlatformTemplate**: TypeScript with platform extensions
- **complexExportsTemplate**: Complex exports with import/require conditions
- **assetResolutionTemplate**: Asset files with scale factors
