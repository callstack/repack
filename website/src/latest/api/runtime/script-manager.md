# ScriptManager

The `ScriptManager` is a low-level utility for managing script resolution, downloading, and execution in React Native applications. It's particularly useful when working with code splitting, dynamic imports, and Module Federation.

:::info title="Why is it called ScriptManager?"

It can be used to download, manage and execute external (either local or remote) JavaScript code.

:::

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

### ScriptManager.shared

The globally shared instance of `ScriptManager`. You should always use this instead of creating new instances.

- **Type:** `ScriptManager`

### addResolver

Adds a new script locator resolver to handle script resolution.

- **Type:** `addResolver(resolver: ScriptLocatorResolver, options?: ResolverOptions): void`
- **Parameters:**
  - `resolver`: Async function that resolves script location data
  - `options`: Configuration options for the resolver
    - `priority`: Priority of the resolver (default: 2)
    - `key`: Unique key to identify the resolver

### removeResolver

Removes a previously added resolver.

- **Type:** `removeResolver(resolver: ScriptLocatorResolver | string): boolean`
- **Parameters:**
  - `resolver`: The resolver function or its unique key to remove
- **Returns:** `true` if resolver was found and removed, `false` otherwise

### removeAllResolvers

Removes all previously added resolvers.

- **Type:** `removeAllResolvers(): void`

### setStorage

Sets a storage backend for caching resolved script locator data.

- **Type:** `setStorage(storage: StorageApi): void`
- **Parameters:**
  - `storage`: Storage API implementation with `getItem` and `setItem` methods

### loadScript

Resolves, downloads, and executes a script.

- **Type:** `loadScript(scriptId: string, caller?: string, webpackContext?: any, referenceUrl?: string): Promise<void>`
- **Parameters:**
  - `scriptId`: Id of the script to load
  - `caller`: Name of the calling script (optional)
  - `webpackContext`: Webpack context (optional)
  - `referenceUrl`: Reference URL for resolution (optional)

### prefetchScript

Downloads a script without executing it.

- **Type:** `prefetchScript(scriptId: string, caller?: string, webpackContext?: any, referenceUrl?: string): Promise<void>`
- **Parameters:**
  - `scriptId`: Id of the script to prefetch
  - `caller`: Name of the calling script (optional)
  - `webpackContext`: Webpack context (optional)
  - `referenceUrl`: Reference URL for resolution (optional)

### invalidateScripts

Clears cache and removes downloaded files for given scripts.

- **Type:** `invalidateScripts(scriptIds?: string[]): Promise<string[]>`
- **Parameters:**
  - `scriptIds`: Array of script ids to invalidate (optional)
- **Returns:** Promise resolving to array of invalidated script ids

## Events

The `ScriptManager` extends `EventEmitter` and provides a comprehensive event system for monitoring and reacting to script loading lifecycle events. Events can be used to track script resolution, loading progress, and handle errors.

### Available Events

The following events are emitted by `ScriptManager`:

| Event Name    | Description                                                      |
| ------------- | ---------------------------------------------------------------- |
| `resolving`   | Emitted when script resolution begins                            |
| `resolved`    | Emitted when script resolution succeeds                          |
| `prefetching` | Emitted when script prefetching begins                           |
| `loading`     | Emitted when script loading begins                               |
| `loaded`      | Emitted when script loading succeeds                             |
| `error`       | Emitted when an error occurs during script resolution or loading |
| `invalidated` | Emitted when scripts are invalidated from cache                  |

### Subscribing to Events

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

## Hooks

The `ScriptManager` provides a hook system that allows developers to intercept and customize the script loading process at various stages. The hooks provide fine-grained control over script resolution and loading, enabling advanced use cases like custom caching strategies, script transformation, and error handling.

### Available Hooks

#### Resolution Hooks

| Hook Name       | Description                                                                |
| --------------- | -------------------------------------------------------------------------- |
| `beforeResolve` | Called before script resolution begins, allows you to modify the arguments |
| `resolve`       | Customise / override the script resolution process                         |
| `afterResolve`  | Modify the resolved script locator after resolution succeeds               |
| `errorResolve`  | Provide a fallback for resolution request when normal resolution fails     |

#### Loading Hooks

| Hook Name    | Description                                                             |
| ------------ | ----------------------------------------------------------------------- |
| `beforeLoad` | Called before script loading begins, allows you to modify the arguments |
| `load`       | Customise / override the script resolution process                      |
| `afterLoad`  | React to successful script loading event                                |
| `errorLoad`  | Provide a fallback for a script when normal loading procedure fails     |

### Using hooks

```js
ScriptManager.shared.hooks.beforeResolve(async (args) => {
  console.debug("ScriptManager.shared.hooks.beforeResolve", args);
  return args;
});

ScriptManager.shared.hooks.resolve(async (args) => {
  console.debug("ScriptManager.shared.hooks.resolve", args);
  const { scriptId, caller, referenceUrl } = args.options;
  for (const [, , resolve] of args.resolvers) {
    const locator = await resolve(scriptId, caller, referenceUrl);
    if (locator) return locator;
  }
});

ScriptManager.shared.hooks.afterResolve(async (args) => {
  console.debug("ScriptManager.shared.hooks.afterResolve", args);
  return args;
});

ScriptManager.shared.hooks.beforeLoad(async (args) => {
  console.debug("ScriptManager.shared.hooks.beforeLoad", args);
  return args;
});

ScriptManager.shared.hooks.load(async (args) => {
  console.debug("ScriptManager.shared.hooks.load", args);
  await args.loadScript();
  return true;
});

ScriptManager.shared.hooks.afterLoad(async (args) => {
  console.debug("ScriptManager.shared.hooks.afterLoad", args);
  return args;
});
```

## Advanced Usage

### Custom Resolver with Retry Logic

```js
import { ScriptManager } from "@callstack/repack/client";

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

### Enabling caching through AsyncStorage

```js
import { ScriptManager } from "@callstack/repack/client";
import AsyncStorage from "@react-native/async-storage";

ScriptManager.shared.setStorage({
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
});
```

### Using per-script caching strategy

```js
ScriptManager.shared.hooks.afterResolve(async (args) => {
  const { locator, options } = args;
  // Implement custom caching logic
  if (shouldCache(locator)) {
    locator.cache = true;
  }
  return args;
});
```

### Override script locator URL after resolution

```js
ScriptManager.shared.hooks.afterResolve(async (args) => {
  const { locator, options } = args;

  // Transform locator URL after it's resolved
  locator.url = transformUrl(locator.url);

  return args;
});
```

### Adding fallback for failed loading of a script

```js
ScriptManager.shared.hooks.errorLoad(async (args) => {
  const { error, options } = args;
  // Implement custom error handling
  if (isRecoverableError(error)) {
    await retryLoading(options);
    return true;
  }
  return false;
});
```
