# ScriptManager

The `ScriptManager` is a low-level utility for managing script resolution, downloading, and execution in React Native applications. It's particularly useful when working with code splitting, dynamic imports, and Module Federation.

## Usage

```js
import { ScriptManager } from "@callstack/repack/client";

ScriptManager.shared.addResolver(async (scriptId, caller) => {
  if (__DEV__) {
    return {
      url: Script.getDevServerURL(scriptId),
      cache: false,
    };
  }

  return {
    url: Script.getRemoteURL(`https://mycdn.example/assets/${scriptId}`),
  };
});

// Example usage with React.lazy and dynamic imports
const TeacherModule = React.lazy(() => import("./Teacher.js"));
const StudentModule = React.lazy(() => import("./Student.js"));

export function App({ role }) {
  if (role === "teacher") {
    return <TeacherModule />;
  }

  return <StudentModule />;
}
```

## API Reference

### Methods

#### `ScriptManager.shared`

- Type: `ScriptManager`

The globally shared instance of `ScriptManager`. You should always use this instead of creating new instances.

#### `addResolver(resolver, options?)`

Adds a new script locator resolver.

```ts
type ScriptLocatorResolver = (
  scriptId: string,
  caller?: string,
  referenceUrl?: string
) => Promise<ScriptLocator | undefined>;

type ResolverOptions = {
  priority?: number;
  key?: string;
};
```

- `resolver`: An async function that resolves script location data
- `options`: Configuration options for the resolver
  - `priority`: Priority of the resolver (default: 2)
  - `key`: Unique key to identify the resolver

#### `removeResolver(resolver)`

Removes a previously added resolver.

- `resolver`: The resolver function or its unique key to remove
- Returns: `boolean` - `true` if resolver was found and removed, `false` otherwise

#### `setStorage(storage)`

Sets a storage backend for caching resolved script locator data.

```ts
type StorageApi = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};
```

#### `loadScript(scriptId, caller?, webpackContext?, referenceUrl?)`

Resolves, downloads, and executes a script.

- `scriptId`: Id of the script to load
- `caller`: Name of the calling script (optional)
- `webpackContext`: Webpack context (optional)
- `referenceUrl`: Reference URL for resolution (optional)

#### `prefetchScript(scriptId, caller?, webpackContext?)`

Downloads a script without executing it.

- `scriptId`: Id of the script to prefetch
- `caller`: Name of the calling script (optional)
- `webpackContext`: Webpack context (optional)

#### `invalidateScripts(scriptIds?)`

Clears cache and removes downloaded files for given scripts.

- `scriptIds`: Array of script ids to invalidate (optional)
- Returns: Promise resolving to array of invalidated script ids

### Events

The `ScriptManager` extends `EventEmitter` and emits the following events:

- `resolving`: `{ scriptId: string, caller?: string }`
- `resolved`: `{ scriptId: string, caller?: string, locator: NormalizedScriptLocator, cache: boolean }`
- `prefetching`: Same as `resolved`
- `loading`: Same as `resolved`
- `loaded`: Same as `resolved`
- `error`: `{ message: string, args: any[], originalError: Error }`
- `invalidated`: `string[]`

## Example with Events

```js
import { ScriptManager } from "@callstack/repack/client";

// Listen for script loading events
ScriptManager.shared.on("loading", (script) => {
  console.log(`Loading script: ${script.scriptId}`);
});

ScriptManager.shared.on("loaded", (script) => {
  console.log(`Successfully loaded script: ${script.scriptId}`);
});

ScriptManager.shared.on("error", (error) => {
  console.error("Script loading failed:", error);
});
```

## Advanced Usage

### Custom Resolver with Retry Logic

```js
ScriptManager.shared.addResolver(async (scriptId) => {
  return {
    url: `https://mycdn.example/assets/${scriptId}`,
    retry: 3, // Number of retry attempts
    retryDelay: 1000, // Delay between retries in milliseconds
    headers: {
      Authorization: "Bearer token",
    },
  };
});
```

### Storage Implementation

```js
import AsyncStorage from "@react-native/async-storage";

ScriptManager.shared.setStorage({
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
});
```

### Module Federation Integration

```js
ScriptManager.shared.addResolver(
  async (scriptId) => {
    if (scriptId.startsWith("remote_")) {
      return {
        url: `https://mycdn.example/remotes/${scriptId}`,
        headers: {
          "X-Container-Name": scriptId,
        },
      };
    }
    return undefined;
  },
  { priority: 3 }
);
```
