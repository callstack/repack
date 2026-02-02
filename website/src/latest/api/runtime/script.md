# Script

The `Script` class provides utility methods for generating script URLs used with `ScriptManager` resolvers. It handles URL construction for different script hosting scenarios: development servers, filesystem, and remote servers.

:::info When to use Script

Use `Script` static methods when configuring resolvers in `ScriptManager.shared.addResolver()` to generate properly formatted URLs for your scripts. The class handles webpack context integration and URL formatting automatically.

:::

## Usage

```js
import { Script, ScriptManager } from "@callstack/repack/client";

ScriptManager.shared.addResolver(async (scriptId, caller) => {
  // Development: load from dev server
  if (__DEV__) {
    return {
      url: Script.getDevServerURL(scriptId),
      cache: false,
    };
  }

  // Production: load from remote CDN
  return {
    url: Script.getRemoteURL(`https://mycdn.example/assets/${scriptId}`),
  };
});
```

## API Reference

### Script.DEFAULT_TIMEOUT

Default timeout for script fetch requests.

- Type: `number`
- Value: `30000` (30 seconds)

### Script.getDevServerURL

Generates a URL for scripts hosted on the development server. This method returns a function that uses webpack context to construct the full URL with the correct public path and script filename.

- Type: `getDevServerURL(scriptId: string): (webpackContext) => string`
- Parameters:
  - `scriptId`: Id of the script to load
- Returns: Function that generates the dev server URL when called with webpack context

```js
ScriptManager.shared.addResolver(async (scriptId) => {
  if (__DEV__) {
    return {
      url: Script.getDevServerURL(scriptId),
      cache: false,
    };
  }
});
```

### Script.getFileSystemURL

Generates a URL for scripts stored on the device's filesystem. Useful when scripts are bundled with the app or downloaded to local storage. The method automatically prepends `file:///` to the scriptId.

- Type: `getFileSystemURL(scriptId: string): (webpackContext) => string`
- Parameters:
  - `scriptId`: Id of the script to load
- Returns: Function that generates the filesystem URL when called with webpack context

```js
ScriptManager.shared.addResolver(async (scriptId) => {
  // Load pre-bundled scripts from filesystem
  return {
    url: Script.getFileSystemURL(scriptId),
    absolute: true,
  };
});
```

### Script.getRemoteURL

Generates a URL for scripts hosted on a remote server. By default, appends the `.chunk.bundle` extension to the URL.

- Type: `getRemoteURL(url: string, options?: { excludeExtension?: boolean }): string | (webpackContext) => string`
- Parameters:
  - `url`: Base URL to the remote location where the script is stored
  - `options`: Additional options
    - `excludeExtension`: When `true`, returns the URL as-is without appending the chunk extension (default: `false`)
- Returns: URL string (if `excludeExtension: true`) or function that generates the URL with extension

```js
ScriptManager.shared.addResolver(async (scriptId) => {
  // Standard usage - extension will be appended
  return {
    url: Script.getRemoteURL(`https://mycdn.example/assets/${scriptId}`),
  };
});

// With excludeExtension for custom file extensions
ScriptManager.shared.addResolver(async (scriptId) => {
  return {
    url: Script.getRemoteURL(
      `https://mycdn.example/assets/${scriptId}.custom.js`,
      { excludeExtension: true }
    ),
  };
});
```

### Script.getScriptUniqueId

Generates a unique identifier for a script, used internally for caching purposes.

- Type: `getScriptUniqueId(scriptId: string, caller?: string): string`
- Parameters:
  - `scriptId`: Id of the script
  - `caller`: Optional caller name to prefix the script id
- Returns: Unique identifier string

```js
// Without caller
Script.getScriptUniqueId("TeacherModule"); // "TeacherModule"

// With caller
Script.getScriptUniqueId("TeacherModule", "host"); // "host_TeacherModule"
```

## Related

- [ScriptManager](/api/runtime/script-manager) - The manager class that uses Script for URL resolution
