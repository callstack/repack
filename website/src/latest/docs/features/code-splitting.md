# Code splitting

Code Splitting is a technique that splits the code into multiple files, which can be loaded on
demand and in parallel.

It can be used to:

- Optimize the initial size of the application and to improve the startup performance by deferring
  the parsing (only with JSC) and execution (JSC and Hermes) of the non-critical code.
- Dynamically deliver content and features to the users based on runtime factors: user's role,
  subscription plan, preferences etc.
- **For developers and companies**: split and isolate pieces of the product to improve scalability
  and reduce coupling.

Code Splitting is one of the most important features in Re.Pack, and it's based on Webpack's
infrastructure as well as the native module
that allows to execute the additional code on the same JavaScript context (same React Native
instance).

:::info

For dynamic feature delivery, Code Splitting should be used as a mean to optimize the user
experience by deferring the features or deliver existing features only to a subset of users.

:::

Code Splitting with Re.Pack is not designed to add new features dynamically without doing the
regular App Store or Play store release. It can be used to deliver fixes or tweaks to additional
(split) code, similarly to Code Push, but you should not add new features with it.

:::caution

Using Code Splitting to deliver new features without a regular App Store release is likely
going to violate Apple's App Store Terms and your application might be rejected or banned.

:::

:::tip

You should provide access to all the features for the App Store review process.

Also, it might be beneficial to highlight that all split features are closely integrated with
application and cannot work in isolation - you don't want to introduce confusion that your
application might compete with Apple's App Store.

On that note, you might want to avoid using terms like _mini-app_ or _mini-app store_ in favour of
_modules_, _components_, _plugins_ or simply _features_.

:::

## Usage

The specific implementation of Code Splitting in your application can be different and should account for your project's specific needs, requirements and limitations.

In general, we can identify 3 main categories of implementation. All of those approaches are based on the same underlying mechanism: Re.Pack's [`ScriptManager`](/api/runtime/script-manager) and the native module for it.

:::tip

Use [Glossary of terms](/docs/resources/glossary) to better understand the content of this documentation.

:::

### Generic usage

On a high-level, all functionalities that enable usage of Webpack's Code Splitting, are powered by
Re.Pack's [`ScriptManager`](/api/runtime/script-manager), which consists of the JavaScript part and the native part.

The [`ScriptManager`](/api/runtime/script-manager) has methods which allows to:

1. Download and execute script - [`loadScript`](/api/runtime/script-manager#loadscript)
2. Prefetch script (without executing immediately) - [`prefetchScript`](/api/runtime/script-manager#prefetchscript)
3. Resolve script location - [`resolveScript`](/api/runtime/script-manager#resolvescript)
4. Invalidate cache - [`invalidateScripts`](/api/runtime/script-manager#invalidatescripts)

In order to provide this functionalities, a resolver has to be added using [`ScriptManager.shared.addResolver`](/api/runtime/script-manager#addresolver):

```ts
import { ScriptManager, Script } from "@callstack/repack/client";

ScriptManager.shared.addResolver(async (scriptId, caller) => {
  // In dev mode, resolve script location to dev server.
  if (__DEV__) {
    return {
      url: Script.getDevServerURL(scriptId),
      cache: false,
    };
  }

  return {
    url: Script.getRemoteURL(
      `http://somewhere-on-the-internet.com/${scriptId}`
    ),
  };
});
```

If the `storage` is provided, the returned `url` from `resolve` will be used for cache management.
You can read more about it in [Caching and Versioning](#caching-and-versioning).

:::info

Do not instantiate `ScriptManager` yourself - use `ScriptManager.shared` to get access to an instance.

:::

Under the hood, the way a script gets loaded can be summarized as follows:

1. `ScriptManager.shared.loadScript(...)` gets called, either:
   - Automatically by the dynamic `import(...)` function handled by Webpack, when using [Async chunks approach](#async-chunks)
   - Manually when using [Scripts approach](#scripts) or [Module Federation](#module-federation)
2. `ScriptManager.shared.loadScript(...)` is called `scriptId` and `caller` arguments, which are either provided by:
   - Webpack, based on it's internal naming logic or a [magic comment: `webpackChunkName`](https://webpack.js.org/migrate/5/#using--webpackchunkname--)
   - Manually
3. `ScriptManager.shared.loadScript(...)` resolves the chunk location using `ScriptManager.shared.resolveScript(...)`.
4. The resolved location is compared against previous location of that script, if and only if, `storage` was provided and the script was resolved before.
5. The resolved location is passed to the native module, which downloads if necessary and executes the script.
6. Once the code has been executed the `Promise` returned by `ScriptManager.shared.loadScript(...)` gets resolved.

:::info

[`ScriptManager.shared.prefetchScript(...)`](/api/runtime/script-manager#prefetchscript) follows
the same behavior except for #6, where it only downloads the file and doesn't execute it.

:::

### Approaches

There are generally 3 approaches to Code Splitting with Webpack and Re.Pack. Keep in mind that the
actual code you will have to create might be slightly different, depending on your project's
requirements, needs and limitations.

Those approaches should be used as a base for your Code Splitting implementation.

:::tip

It's recommended to read [Generic usage](#generic-usage) first, to understand it on a high-level and
get the necessary context.

:::

#### Async chunks

Async chunks (or asynchronous chunks) are the easiest Code Splitting approach. They are usually
created by using dynamic `import(...)` function, which makes them extremely easy to introduce it
into the codebase.

The async chunks are created alongside the main bundle as part of a single
Webpack compilation, making it a great choice for a modular applications where all the code is
developed in-house.

The usage of async chunks essentially boils down to calling `import(...)` in your code, for example:

```js
const myChunk = await import("./myChunk.js");
```

Async chunks created by dynamic `import(...)` function can be nicely integrated using `React.lazy`
and `React.Suspense`:

```jsx
// MyChunk.js
export default function MyChunk(props) {
  return /* ... */;
}

// App.js
const MyChunk = React.lazy(() => import("./MyChunk.js"));

function App() {
  return (
    <React.Suspense fallback={<Text>Loading...</Text>}>
      <MyChunk /* someProp="someValue" */ />
    </React.Suspense>
  );
}
```

For each file in the dynamic `import(...)` function a new chunk will be created - those chunks will
be remote chunks by default.

:::tip

You can learn more about local and remote chunks in the dedicated [Local vs Remote chunks guide](#local-vs-remote-chunks).

:::

:::tip

To learn more or use async chunks in your project, check out our [dedicated Async chunks guide](#guide-async-chunks).

:::

:::tip

To see `import(...)`, `React.lazy` and `React.Suspense` in action, check out
[Re.Pack's `TesterApp`](https://github.com/callstack/repack/blob/main/apps/tester-app/src/asyncChunks/AsyncContainer.tsx).

:::

:::caution

Don't forget to add resolver using [`ScriptManager.shared.addResolver`](/api/runtime/script-manager#addresolver)!

:::

#### Scripts

This approach allows to execute arbitrary code in your React Native application.
It's a similar concept as adding a new `<script>` element to a Web page.

Those scripts can be written in-house or externally, bundled using Webpack or a different bundler.
This also means that scripts can be created as part of separate Webpack compilations, or separate
build pipelines, from separate codebases and repositories.

:::warning

Scripts should only be used by advanced users with deep Webpack knowledge and experience.

Scripts give a lot of flexibility but it also means the support for them is limited. It's not possible for Re.Pack's
contributors to support all potential setups using this approach.

:::

:::caution

Beware, with dynamic scripts **there's no dependency sharing by default**. If you want your scripts
to reuse existing dependencies from the main bundle, it's up to you to figure out how to do it.
A good starting point would be:

- https://webpack.js.org/configuration/externals/
- https://webpack.js.org/plugins/dll-plugin/

:::

Loading a script is as simple as running a single function:

```js
await ScriptManager.shared.loadScript("my-script");
console.log("Script loaded");
```

And adding a resolver to the [`ScriptManager`](/api/runtime/script-manager#addResolver) to resolve your
scripts:

```js
import { ScriptManager, Script } from "@callstack/repack/client";

ScriptManager.shared.addResolver(async (scriptId) => {
  if (scriptId === "my-script") {
    return {
      url: Script.getRemoteURL("https://my-domain.dev/my-script.js", {
        excludeExtension: true,
      }),
    };
  }
});
```

#### Module Federation

Use [Module Federation](./module-federation) document for information on adoption of Module Federation in React Native projects with Re.Pack.

## Guide: Async chunks

Let's assume, we are building an E-Learning application with specific functionalities for a student
and for a teacher. Both student and a teacher will get different UIs and different features, so it
would make sense to isolate the student's specific code from the teacher's. That's were Code
Splitting comes into play - we can use dynamic `import(...)` function together with `React.lazy` and
`React.Suspense` to conditionally render the student and the teacher sides based on the user's role.
The code for the student and the teacher will be put into a remote async chunk, so that the initial
download size will be smaller.

:::tip

It's recommended to read:

- [Concept](#concept)
- [Generic usage](#generic-usage)
- [Async chunks usage](#async-chunks)

first, to understand Code Splitting, usage on a high-level and get the necessary context.

:::

:::tip

Before you begin, make sure the Re.Pack's native module is linked into your application:

- https://reactnative.dev/docs/linking-libraries-ios
- https://github.com/react-native-community/cli/blob/master/docs/autolinking.md

:::

### Source code

Let's use the following code for the student's side:

```jsx
// StudentSide.js
import * as React from "react";
import { View, Text } from "react-native";

export default function StudentSide({ user }) {
  return (
    <View style={{ flex: 1 }}>
      <Text>Hello {user.name}!</Text>
      <Text>You are a student.</Text>
      {/* ...more student related code */}
    </View>
  );
}
```

And a code for the teacher's side:

```jsx
// TeacherSide.js
import * as React from "react";
import { View, Text } from "react-native";

export default function TeacherSide({ user }) {
  return (
    <View style={{ flex: 1 }}>
      <Text>Hello {user.name}!</Text>
      <Text>You are a teacher.</Text>
      {/* ...more teacher related code */}
    </View>
  );
}
```

Now in our parent component, which will be common for both the student and the teacher:

```jsx
// Home.js
import * as React from "react";
import { Text } from "react-native";

const StudentSide = React.lazy(() =>
  import(/* webpackChunkName: "student" */ "./StudentSide.js")
);

const TeacherSide = React.lazy(() =>
  import(/* webpackChunkName: "teacher" */ "./TeacherSide.js")
);

export function Home({ user }) {
  const Side = React.useMemo(
    () =>
      user.role === "student" ? (
        <StudentSide user={user} />
      ) : (
        <TeacherSize user={user} />
      ),
    [user]
  );

  return (
    <React.Suspense fallback={<Text>Loading...</Text>}>
      <Side />
    </React.Suspense>
  );
}
```

Since we are using Webpack's magic comments, we need to make sure Babel is not removing those.
Add `comments: true` to your Babel config, for example:

```js
module.exports = {
  presets: ["module:metro-react-native-babel-preset"],
  comments: true,
};
```

At this point all the code used by `StudentSide.js` will be put into `student.chunk.bundle` and
`TeacherSide.js` into `teacher.chunk.bundle`.

Before we can actually render out application, we need to add resolver using [`ScriptManager.shared.addResolver(...)`](/api/runtime/script-manager#addresolver),
so it can resolve the chunks:

```js
// index.js
import { AppRegistry } from "react-native";
import { ScriptManager, Script } from "@callstack/repack/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import App from "./src/App"; // Your application's root component
import { name as appName } from "./app.json";

ScriptManager.shared.setStorage(AsyncStorage);
ScriptManager.shared.addResolver(async (scriptId) => {
  // `scriptId` will be either 'student' or 'teacher'

  // In dev mode, resolve script location to dev server.
  if (__DEV__) {
    return {
      url: Script.getDevServerURL(scriptId),
      cache: false,
    };
  }

  return {
    url: Script.getRemoteURL(
      `http://somewhere-on-the-internet.com/${scriptId}`
    ),
  };
});

AppRegistry.registerComponent(appName, () => App);
```

This code will allow Re.Pack's [`ScriptManager`](/api/runtime/script-manager) to
actually locate your chunks for the student and the teacher, and download them.

When bundling for production/release, all remote chunks, including `student.chunk.bundle` and
`teacher.chunk.bundle` will be copied to `<projectRoot>/build/output/<platform>/remote` by default,
for example: `<projectRoot>/build/output/ios/student.chunk.bundle`.

You should upload files from this directory to a remote server or a CDN from where `ScriptManager`
will download them.

:::tip

You can change this directory and/or mark chunks as local. Refer to dedicated [Local vs Remote chunks guide](#local-vs-remote-chunks)
for more information.

:::

## Local vs Remote chunks

Each chunk created by using dynamic `import(...)` function can be either remote or a local chunk.

**By default all chunks are remote.**

### Chunk naming

Regardless of the chunk's type, it's important to understand how chunks are named.

:::info

Chunk naming is handled solely by Webpack. Re.Pack does not alter or customize chunk names in any way.

:::

By default, chunk name is inferred by Webpack based on the source filename. For example if you have a file
`./src/Button.js`, the inferred name would be `src_Button_js`. This human-readable chunk name will only be used
in development though. By default, Webpack in production, minimizes chunk names to numbers to save space,
meaning `src_Button_js` chunk in production might look like `137`.

This behavior is fine for Web, but in React Native with `ScriptManager`, it's not ideal, because we don't know what
this number will be in production.

There are 2 options to address this problem:

1. Set [`optimization.chunkIds`](https://webpack.js.org/configuration/optimization/#optimizationchunkids) option to `named` in Webpack config.
1. Use `/* webpackChunkName: "<name>" */` magic comment in `import(...)`.

:::tip

You can use both `optimization.chunkIds` and `webpackChunkName` comment at the same time. They are not mutually exclusive.

:::

:::tip

Chunk extension can be configured in [`output.chunkFilename`](https://webpack.js.org/configuration/output/#outputchunkfilename), which is set to `.chunk.bundle` by default.
It's usually **not** necessary to modify it.

:::

#### Named `chunkIds` config option

Setting [`optimization.chunkIds`](https://webpack.js.org/configuration/optimization/#optimizationchunkids) option to `named` in your Webpack config will
force Webpack to always use the human-readable form for the name of the chunks.

:::info

In version `3.x`, Re.Pack's templates for Webpack config have `chunkIds` is set to `named` by default.

:::

```js
/* ... */

export default (env) => {
  /* ... */

  return {
    /* ... */

    optimization: {
      /* ... */

      chunkIds: "named",
    },

    /* ... */
  };
};
```

:::tip

Keep in mind that, `webpackChunkName` magic comment will always take precedence, so even if you have `chunkIds: 'named'`, Webpack will use name in `webpackChunkName`
comment for that chunk instead of the inferred one.

:::

#### `webpackChunkName` magic comment

`webpackChunkName` magic comment allows you to provide your own custom name that should be used for the chunk when calling `import(...)` function:

```js
import(/* webpackChunkName: "button" */ "./Button");
```

This example will result in chunk being named `button`, so the filename with extension will be `button.chunk.bundle`.

:::tip

You can use `webpackChunkName` magic comment to provide your custom name, regardless of the `optimization.chunkIds` option.
`webpackChunkName` will always take precedence.

:::

### Remote chunks

By default all chunks are remote chunks, meaning they are not bundled into the application and will be downloaded from the remote location (usually the Internet) on demand.
This helps with reducing the initial application size, especially if you have logic or features that only a subset of users will use - it doesn't make sense for everyone else
to always have to download the code (together with the application) they won't need.

All remote chunks are stored under `<projectRoot>/build/output/<platform>/remotes` by default. For example if `button.chunk.bundle` is a remote chunk, it will be stored under:
`<projectRoot>/build/output/ios/remotes/button.chunk.bundle` for iOS.

You can customize this by providing [`extraChunks`](/api/plugins/repack#extrachunks) to [`RepackPlugin`](/api/plugins/repack):

```js
/* ... */

export default (env) => {
  /* ... */

  return {
    /* ... */

    plugins: [
      new Repack.RepackPlugin({
        /* ... */

        extraChunks: [
          {
            test: /.*/,
            type: "remote",
            outputPath: path.join("my/custom/path"),
          },
        ],
      }),
    ],
  };
};
```

This example, will mark all chunks as remote ones and store them under `<projectRoot>/my/custom/path`.

If `outputPath` in `extraChunks` is a relative path, it will be joined with the value of `context` property, which is set to root directory of your project by default.
You can also provide an absolute path, in which case, it won't be modified in any way and used as is.

:::tip

You can provide multiple `type: 'remote'` specs - see [Advanced example](#advanced-example) for more info.

:::

### Local chunks

In some situations, having chunks as remote ones is not ideal. For example, if you know that majority of the users will need a specific chunk you can mark it as local.

Local chunks will always be included in the final application (`.ipa` or `.apk`) file alongside main bundle. This can save mobile data usage and make your application feel
faster (in cases where network connection is degraded), but you will still benefit from improved startup, because the JavaScript engine will defer parsing and evaluation of
local chunks until they are actually needed.

:::tip

If you're using Hermes and you compile your code into bytecode bundles, it's better **not** to use local chunks and instead make the code a part of the main bundle.

Using **local** chunks with Hermes and bytecode bundles, will likely result **in worse performance**.

:::

You can customize which chunk should be local by providing [`extraChunks`](/api/plugins/repack#extrachunks) option in [`RepackPlugin`](/api/plugins/repack) configuration:

```js
/* ... */

export default (env) => {
  /* ... */

  return {
    /* ... */

    plugins: [
      new Repack.RepackPlugin({
        /* ... */

        extraChunks: [
          {
            include: /^.+\.local$/,
            type: "local",
          },
          {
            // IMPORTANT!
            exclude: /^.+\.local$/,
            type: "remote",
            outputPath: path.join("build/output", platform, "remote"), // Default path
          },
        ],
      }),
    ],
  };
};
```

The example above will make all chunks matching the RegExp `/^.+\.local$/` a local chunks, for example `student.local` (`student.local.chunk.bundle`) will be a local chunk, whereas everything else will become a remote.

:::warning

Specifying `extraChunks` will override any defaults - you must configure `remote` chunks yourself as well, otherwise they won't be stored anywhere!

:::

Once you have some chunks as local, you need to alter the resolver in [`ScriptManager.shared.addResolver`](/api/runtime/script-manager#addresolver):

```js
import { ScriptManager, Script } from "@callstack/repack/client";

ScriptManager.shared.addResolver(async (scriptId) => {
  // In development, get all the chunks from dev server.
  if (__DEV__) {
    return {
      url: Script.getDevServerURL(scriptId),
      cache: false,
    };
  }

  // In production, get chunks matching the regex from filesystem.
  if (/^.+\.local$/.test(scriptId)) {
    return {
      url: Script.getFileSystemURL(scriptId),
    };
  } else {
    return {
      url: Script.getRemoteURL(`https://my-domain.dev/${scriptId}`),
    };
  }
});
```

:::tip

To avoid having to repeat the RegExp, you can create a new `.js` or `.json` file, export the RegExp and use the file both in the source code as well as in the Webpack config.

Check out the [`local-chunks` example](https://github.com/callstack/repack-examples) for concrete implementation.

:::

### Advanced example

You can mix multiple `type: 'local'` and `type: 'remote'` specs using `test`, `include` and `exclude` to match different chunks:

```js
/* ... */

export default (env) => {
  /* ... */

  return {
    /* ... */

    plugins: [
      new Repack.RepackPlugin({
        /* ... */

        extraChunks: [
          {
            // Make all student related chunks local.
            include: ["student", /^student-.+$/],
            type: "local",
          },
          {
            // Anything not student related should be remote and stored under
            // `<projectRoot>/build/output/<platform>/remotes/core`.
            exclude: /^student-.+$/,
            type: "remote",
            outputPath: path.join("build/output", platform, "remotes/core"),
          },
          {
            // All teacher related chunks should be remote and stored under
            // `<projectRoot>/build/output/<platform>/remotes/teacher`.
            test: /^teacher.*$/,
            type: "remote",
            outputPath: path.join("build/output", platform, "remotes/teacher"),
          },
        ],
      }),
    ],
  };
};
```

Use the table below for examples, how the config above would treat different chunks:

| Name                   | `type`   | `outputPath`                                            |
| ---------------------- | -------- | ------------------------------------------------------- |
| `student`              | `local`  | -                                                       |
| `student-extensions`   | `local`  | -                                                       |
| `components`           | `remote` | `<projectRoot>/build/output/<platform>/remotes/core`    |
| `utils`                | `remote` | `<projectRoot>/build/output/<platform>/remotes/core`    |
| `teacher`              | `remote` | `<projectRoot>/build/output/<platform>/remotes/teacher` |
| `teacher-affiliations` | `remote` | `<projectRoot>/build/output/<platform>/remotes/teacher` |

:::tip

`test`, `include` and `exclude` properties behave in the same way as those in [Webpack's loader rules](https://webpack.js.org/configuration/module/#rule-conditions):

- `test: string | RegExp | Array<string | RegExp>` must match if specified
- `include: string | RegExp | Array<string | RegExp>` must match if specified
- `exclude: string | RegExp | Array<string | RegExp>` must **not** match if specified

:::

## Caching and versioning

The caching mechanism in Re.Pack prevents scripts over-fetching, which helps reducing
bandwidth usage, specially since they can easily take up multiple MBs od data.

Providing `storage` options to
[`ScriptManager.shared.setStorage`](/api/runtime/script-manager#setstorage) will enable
caching of downloaded script. The `storage` option accepts anything with similar
API to `AsyncStorage`'s `getItem`, `setItem` and `removeItem` functions.

By default, [`ScriptManager`](/api/runtime/script-manager) will compare the `method`/`url`/`query`/`header` or `body`
returned by `resolve` with the values stored in `storage` to determine if downloading is
necessary. Skipping the download will only happen, if the values are equal, meaning you can introduce
versioning by changing the `url`, for example:

```js
import { ScriptManager, Script } from "@callstack/repack/client";

ScriptManager.shared.setStorage(AsyncStorage);
ScriptManager.shared.addResolver(async (scriptId) => {
  const { version } = await getRemoteConfig();

  return {
    url: Script.getRemoteURL(`http://my-domain.dev/v${version}/${scriptId}`),
  };
});
```

Or by keeping the base URL inside remote config:

```js
import { ScriptManager, Script } from "@callstack/repack/client";

ScriptManager.shared.setStorage(AsyncStorage);
ScriptManager.shared.addResolver(async (scriptId) => {
  const { baseURL } = await getRemoteConfig();

  return {
    url: Script.getRemoteURL(`${baseURL}/${scriptId}`),
  };
});
```

:::caution

Versioning should be use with caution. If you upload a new version of a script and it happens that old main bundle is not compatible with new files, you
might end up with broken application or crashes.

:::

Usually cache invalidation happens automatically, but it's possible to invalidate chunk manually as
well using [`ScriptManager.shared.invalidateScripts(...)`](/api/runtime/script-manager#invalidatescripts),
which removes the scripts from filesystem and from the `storage`.

:::warning

Be careful what scripts are you manually invalidating - it's possible to remove local scripts from
filesystem using this API.

:::
