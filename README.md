<h1 align="center">react-native-webpack-toolkit</h1>
<p align="center">
A Webpack-based toolkit to build your React Native application with full support of Webpack ecosystem.
</p>

---

[![Go to: Installation][goto-installation-badge]][goto-installation]
[![Go to: Usage][goto-usage-badge]][goto-usage]
[![Go to: Usage][goto-api-docs-badge]][goto-api-docs]

[![Go to: Usage][goto-contributing-badge]][goto-contributing]
[![Go to: Usage][goto-architecture-badge]][goto-architecture]

[![Build Status][build-badge]][build]
[![Version][version-badge]][version]
[![MIT License][license-badge]][license]
[![PRs Welcome][prs-welcome-badge]][prs-welcome]
[![Code of Conduct][coc-badge]][coc]

`react-native-webpack-toolkit` is a next generation of [Haul](https://github.com/callstack/haul) — a Webpack-based bundler for React Native applications.

`react-native-webpack-toolkit` uses Webpack 5 and React Native CLI's plugin system to allow you to bundle your application using Webpack and allow to easily switch from Metro.

__Check the base [`webpack.config.js`](./templates/webpack.config.js) template, if you're curious how it all looks like.__

## Features

- [x] Webpack ecosystem, plugins and utilities
- [x] Build production bundle for iOS, Android and out-of-tree platforms
- [x] Build development bundle for iOS, Android and out-of-tree platforms
- [x] Development server with support for:
  - Remote JS debugging
  - Source Map symbolication 
  - Hot Module Replacement and React Refresh
  - Reloading application from CLI using `r` key
- [x] Built-in Hot Module Replacement + React Refresh support
- [x] Flipper support:
  - Crash Reporter,
  - Application logs
  - Layout
  - Network
  - React DevTools
  - Development server (debugging/verbose) logs
- [x] Hermes support:
  - Running the production/development bundle using Harmes engine
  - Transforming production bundle into bytecode bundle
- [x] [Asynchronous chunks support](#asynchronous-chunks):
  - Dynamic `import()` support with and without `React.lazy()`.
  - Manual chunks using [`entry` option](https://webpack.js.org/concepts/entry-points/).

### Planned features

- [ ] `ChunksToHermesBytecodePlugin` plugin to automatically transform async chunks to bytecode format.
- [ ] Inspecting Hermes with Flipper
- [ ] `webpack-init` command
- [ ] Web dashboard / Flipper plugin with:
  - Logs
  - Compilations progress, errors and emitted assets
  - Bundle visualizations
- [ ] [Module Federation](https://medium.com/swlh/webpack-5-module-federation-a-game-changer-to-javascript-architecture-bcdd30e02669) support

## Why & when

The main feature of `react-native-webpack-toolkit` is Webpack and its ecosystem of loaders, plugins and support for various features like symlinks, aliases etc. However, because `react-native-webpack-toolkit` is based on Webpack, it is targeted towards advanced users who already know how to use Webpack and want to leverage Webpack ecosystem.

If you're just starting with React Native, it's better to stick with the default solution — Metro, since you probably won't benefit much from switching to Webpack.

## Design goals

1. `react-native-webpack-toolkit` was design for the advanced users, as such it exposes _low-level API_ in form of Webpack plugins and utilities, meaning we only give you the tools you need to build React Native application, but the actual configuration and maintenance of said config is on your shoulders.
2. To support wide variety of use cases and give you as much control as possible, `react-native-webpack-toolkit` is written to allow you to bundle and run development server directly from Webpack CLI as well by using React Native CLI. You can pick one you want to go with.
3. Based on our experience with [Haul](https://github.com/callstack/haul), we shift as much responsibility onto you as possible, so that we can develop features, move at reasonable pace and reduce maintenance cost. Therefor, `react-native-webpack-toolkit` should be used by seasoned React Native developers with at least basic experience with Webpack.
4. __[Future]__ We plan to use `react-native-webpack-toolkit` as a foundation for bringing multi-bundle support to React Native, by allowing you to use asynchronous chunks and finally Webpack 5 latest feature — [Module Federation](https://medium.com/swlh/webpack-5-module-federation-a-game-changer-to-javascript-architecture-bcdd30e02669).


## `react-native-webpack-toolkit` vs Metro

Both Metro and `react-native-webpack-toolkit` have different approaches for the similar problem — bundling JavaScript code for your React Native application, where Metro is custom-built solution and `react-native-webpack-toolkit` uses Webpack. As a result there few differences that you should consider when deciding the solution to use:

- Metro is slightly faster, since it has less overhead compared to Webpack, and it's configuration options, plugin and loader system.
- Webpack configuration options and ecosystem allows for much greater control and support for advanced use-cases.
- Metro's Fast Refresh is slightly more flexible compared to Webpack's solution: Hot Module Replacement + React Refresh — some cases require full application reloaded with `react-native-webpack-toolkit`, but they are supported with Metro See: [Known issues](#known-issues).

## `react-native-webpack-toolkit` vs Haul

`react-native-webpack-toolkit` is a direct successor to [Haul](https://github.com/callstack/haul). Therefore we took the experience we gained with Haul while making rather major changes in the approach:

- `react-native-webpack-toolkit` has smaller footprint and allows for greater level of customization, since you have access to the Webpack config.
- `react-native-webpack-toolkit` supports Hot Module Replacement + React Refresh, whereas Haul does not.
- `react-native-webpack-toolkit` doesn't support any kind of multi-bundling __yet__, whereas Haul supports legacy implementation of multi-bundling (though it requires to alter React Native source code, so we don't recommend that).
- `react-native-webpack-toolkit` delivers better Developer Experience by providing you with more meaningful logs, easier usage and more customizability.

## Installation & setup

### Compatibility with Webpack

On paper, `react-native-webpack-toolkit` should work with any version of Webpack 5, but we recommend to consult with the compatibility table blow.
The table represents versions of `webpack` for which `react-native-webpack-toolkit` is confirmed to work correctly.

If you don't see your version, give it a go. If it doesn't work, please open an issue.

| `webpack`  | `react-native-webpack-toolkit` |
| ---------- | ------------------------------ |
| `5.22.0`   | `1.0.x`, `1.1.x`, `1.2.x`      |
| `>=5.29.0` | `1.2.x`,                       |

1. Install necessary dependencies:

```bash
npm i -D webpack terser-webpack-plugin babel-loader react-native-webpack-toolkit
# or
yarn add -D webpack terser-webpack-plugin babel-loader react-native-webpack-toolkit
```

2. Create `webpack.config.js` based on the [template](./templates/webpack.config.js).
3. Configure XCode/Gradle to use `webpack-bundle`/`webpack-start` commands:
   - XCode: Add `export BUNDLE_COMMAND=webpack-bundle` to **_Bundle React Native code and images_** phase inside **_Build Phases_** in your project XCode config. The final phase should look similar to:
     ```bash
     export NODE_BINARY=node
     export BUNDLE_COMMAND=webpack-bundle
     ../node_modules/react-native/scripts/react-native-xcode.sh
     ```
   - Gradle: Add `bundleCommand: "webpack-bundle"` setting to `project.ext.react` inside `android/app/build.gradle` file, so it looks similar to:
     ```groovy
     project.ext.react = [
         enableHermes: false,  // clean and rebuild if changing
         bundleCommand: "webpack-bundle",
         bundleInDebug: false
     ]
     ```
4. Now you can build your app for production or run development server with `npx react-native webpack-start` and develop your app.

## Usage

Once you've completed [Installation & setup](#installation--setup) you can:

- Build your application for production using XCode/Android Studio/Gradle/Fastlane or whichever tool you use.
- Develop your application by starting development server with `npx react-native webpack-start`.
- Create JavaScript bundle only by running `npx react-native webpack-bundle`.
- Create JavaScript bundle or start development server with Webpack CLI by running `npx webpack-cli -c webpack.config.js`.

## API documentation

The API documentation is available at [https://react-native-webpack-toolkit.netlify.app/](https://react-native-webpack-toolkit.netlify.app/).

## Asynchronous chunks

Asynchronous chunks allows you to split your code into separate files using dynamic `import()` or by
manually declaring them in Webpack configuration using [`entry` option](https://webpack.js.org/concepts/entry-points/).

Each chunk's code will get saved separately from the main bundle inside its own `.chunk.bundle` file and included in the
final application file (`ipa`/`apk`). Chunks can help you improve startup time by deferring parts of the application
from being both parsed and evaluated at the start of the app. The chunks code will still be included in the file,
so the total download size the user will have to download from App Store/Google Play will not shrink.

Asynchronous chunks support requires `react-native-webpack-toolkit` native module to be included in the app
to download/read and evaluate JavaScript code from chunks. By default, the native module should be auto-linked
so there's no additional steps for you to perform. The template [`webpack.config.js`](./templates/webpack.config.js)
is configured to support asynchronous chunks as well. 

### Asynchronous chunks and Hermes

Chunks are fully supported when using Hermes, with one caveat: only the main bundle will be automatically
transformed into bytecode bundle by Hermes. By default, all chunks will be left as regular JavaScript files.

If you want all files, including chunks, to be transformed into bytecode ones, you will need to add
additional build task/step to XCode/Gradle configuration to transform chunks with Hermes CLI or create
a Webpack plugin to transform chunks with Hermes CLI after compilation is finished, but before the
process exits.

In the future you will be able to use `ChunksToHermesBytecodePlugin` for that.

## Known issues

### Hot Module Replacement / React Refresh

#### 1. Root component used by `AppRegistry.registerComponent` will always require full reload.

With Webpack's Hot Module Replacement, the modules don't refresh themselves, but their parents refresh them, meaning for components `A` -> `B` (`A` renders `B`),
if you edit `B`, the component `A` will refresh `B`, but if you edit component `A` there's no one to refresh `A`.

The easiest workaround it create additional component that will simply render your previous root component, eg:

```js
// --- index.js -------------------------------------------
import React from 'react';
import { App } from './App';

// Your new root component, make sure it's exported!
// Editing `Root` will result in full page reload`
export function Root() {
  return <App />;
}

AppRegistry.registerComponent('AppName', () => Root);

// --- App.js ---------------------------------------------
import React from 'react';
// -- snip --

// `Root` will refresh `App` so HMR wll work as expected.
export function App() {
  // -- snip --
}

```

#### 2. Stack traces are different after Hot Module Replacement update.

After applying Hot Module replacement update, if the error is throw or `console.log`/`console.error` is called,
the stack trace that React Native prints will be different — less precise — compared to running the same code after a full reload.

It's because HMR updates (which can consist of multiple files and runtime logic) created by Webpack
have to evaluated at once, so it's impossible for the JavaScript engine to identify from which file each pice of code from HMR update is.
Instead it will fallback to the name of the file that evaluated the update — `WebpackHMRClient.ts`.

This expected and there's little we can do about it. The stack trace is still correct, but it's less precise.

If you encounter such situation, and you need to get the precise stack trace, you can do a full reload
and reproduce the error or `console.log`/`console.error` call.

## Made with ❤️ at Callstack

`react-native-webpack-toolkit` is an open source project and will always remain free to use. If you think it's cool, please star it 🌟. [Callstack][callstack-readme-with-love] is a group of React and React Native geeks, contact us at [hello@callstack.com](mailto:hello@callstack.com) if you need any help with these or just want to say hi!

<!-- badges -->
[callstack-readme-with-love]: https://callstack.com/?utm_source=github.com&utm_medium=referral&utm_campaign=react-native-paper&utm_term=readme-with-love
[goto-installation-badge]: https://img.shields.io/badge/go%20to-Installation-blue?style=flat-square
[goto-installation]: #installation--setup
[goto-usage-badge]: https://img.shields.io/badge/go%20to-Usage-blue?style=flat-square
[goto-usage]: #usage
[goto-api-docs-badge]: https://img.shields.io/badge/go%20to-API%20docs-blue?style=flat-square
[goto-api-docs]: https://react-native-webpack-toolkit.netlify.app/

[goto-contributing-badge]: https://img.shields.io/badge/go%20to-CONTRIBUTING.md-blue?style=flat-square
[goto-contributing]: ./CONTRIBUTING.md
[goto-architecture-badge]: https://img.shields.io/badge/go%20to-ARCHITECTURE.md-blue?style=flat-square
[goto-architecture]: ./ARCHITECTURE.md

[build-badge]: https://img.shields.io/github/workflow/status/callstack/react-native-webpack-toolkit/CI/main?style=flat-square
[build]: https://github.com/callstack/react-native-webpack-toolkit/actions/workflows/main.yml
[version-badge]: https://img.shields.io/npm/v/react-native-webpack-toolkit?style=flat-square
[version]: https://www.npmjs.com/package/react-native-webpack-toolkit
[license-badge]: https://img.shields.io/npm/l/react-native-webpack-toolkit.svg?style=flat-square
[license]: https://github.com/callstack/react-native-webpack-toolkit/blob/master/LICENSE
[prs-welcome-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square
[prs-welcome]: ./CONTRIBUTING.md
[coc-badge]: https://img.shields.io/badge/code%20of-conduct-ff69b4.svg?style=flat-square
[coc]: https://github.com/callstack/react-native-webpack-toolkit/blob/master/CODE_OF_CONDUCT.md
