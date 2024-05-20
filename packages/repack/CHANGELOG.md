# @callstack/repack

## 5.0.0-next.1

### Patch Changes

- TargetPlugin & init fixes

- Updated dependencies []:
  - @callstack/repack-dev-server@5.0.0-next.1

## 5.0.0-next.0

### Major Changes

- [`9b0acc7`](https://github.com/callstack/repack/commit/9b0acc7879c59d54cf8e8118cbabb341d24af18c) Thanks [@jbroma](https://github.com/jbroma)! - V5 Rspack Preview

## 4.0.0

### Major Changes

- [#430](https://github.com/callstack/repack/pull/430) [`0d96b11`](https://github.com/callstack/repack/commit/0d96b11ff3a6e2c21eb622e21ff7947db29a3272) Thanks [@jbroma](https://github.com/jbroma)! - Upgrade to Node 18, drop support for Node 16

- [#530](https://github.com/callstack/repack/pull/530) [`470a7c1`](https://github.com/callstack/repack/commit/470a7c1da6043904c82f53c2a0c82e73c438299a) Thanks [@jbroma](https://github.com/jbroma)! - Remove `ReactRefreshPlugin` in favor of `DevelopmentPlugin`

- [#435](https://github.com/callstack/repack/pull/435) [`63d973f`](https://github.com/callstack/repack/commit/63d973ff4bae6f30f50a39a9f49095be4ce52967) Thanks [@jbroma](https://github.com/jbroma)! - `CodeSigningPlugin` no longer accepts `outputPath` property as configuration option, performs the code-signing in-place and integrates nicely with OutputPlugin

- [#537](https://github.com/callstack/repack/pull/537) [`6fa32cb`](https://github.com/callstack/repack/commit/6fa32cb575ea2c845a700511669fdcb5124acc4d) Thanks [@jbroma](https://github.com/jbroma)! - Override the default `start` and `bundle` CLI commands for enhanced functionality and compatibility with `react-native` versions >= 0.74. Additionally, this update ensures that running `react-native run-ios` or `react-native run-android` will launch the Re.Pack dev server by default instead of the Metro dev server.

- [#525](https://github.com/callstack/repack/pull/525) [`a74930b`](https://github.com/callstack/repack/commit/a74930bd4b5d704d35e182f7ddfea340a0a07793) Thanks [@jbroma](https://github.com/jbroma)! - `getResolveOptions` is now way more compatible with `metro-resolver` and `@react-native/metro-config`

  1. `getResolveOptions` now accepts a second optional parameter called options with the following properties:
     - `enablePackageExports` - defaults to `false`
     - `preferNativePlatform` - defaults to `true`
  2. Order of extensions was changed to match the order from `@react-native/metro-config`.
  3. Resolution via Package Exports (`exports` field in package.json) is now optional and disabled by default.
     It can now be enabled via `getResolveOptions` options parameter. This change was introduced to match `metro` defaults.
  4. Default `conditionNames` are now: `['require', 'import', 'react-native']` and match `@react-native/metro-config` defaults.

- [#495](https://github.com/callstack/repack/pull/495) [`50a7257`](https://github.com/callstack/repack/commit/50a7257f1da9af44c5b6690c31408607d358b2e5) Thanks [@troZee](https://github.com/troZee)! - Add support for New Architecture

### Minor Changes

- [#539](https://github.com/callstack/repack/pull/539) [`8270cb7`](https://github.com/callstack/repack/commit/8270cb7e2ccce9e2020517216e72302b6ba5833a) Thanks [@jbroma](https://github.com/jbroma)! - OutputPlugin now supports configuration with empty object as compilation entry

- [#582](https://github.com/callstack/repack/pull/582) [`24585c0`](https://github.com/callstack/repack/commit/24585c07429533a0543eb61426771d196bdee0f1) Thanks [@jbroma](https://github.com/jbroma)! - Use `localhost` as a defined default for the dev-server

- [#508](https://github.com/callstack/repack/pull/508) [`fec8962`](https://github.com/callstack/repack/commit/fec8962b45f3d744d7c41e8f6eeae0a2310c7693) Thanks [@RafikiTiki](https://github.com/RafikiTiki)! - Added pass-through `experimentalDebugger` flag to CLI commands to ensure compatibility with Metro and new experimental debugger for React Native

### Patch Changes

- [#580](https://github.com/callstack/repack/pull/580) [`b6c68dc`](https://github.com/callstack/repack/commit/b6c68dc08a463880f2869610648336bc7e764a41) Thanks [@jbroma](https://github.com/jbroma)! - Make Re.Pack compatible with use_frameworks!

- [#491](https://github.com/callstack/repack/pull/491) [`ebf1b19`](https://github.com/callstack/repack/commit/ebf1b19976edc603ebe4de992665d10a5bc30eaa) Thanks [@hosseinmd](https://github.com/hosseinmd)! - Log error before exit during bundling

- [#499](https://github.com/callstack/repack/pull/499) [`15ffcba`](https://github.com/callstack/repack/commit/15ffcbabd9c9f0dadc3d91489d3b76c4cd80155f) Thanks [@jbroma](https://github.com/jbroma)! - Support non-classic(e.g. pnpm) paths to HMRClient from react-native

- [#496](https://github.com/callstack/repack/pull/496) [`a59b8ed`](https://github.com/callstack/repack/commit/a59b8ed4adab99f5e10024ae6f24ad18cdad791e) Thanks [@krozniata](https://github.com/krozniata)! - Remove duplicated React-Core dependency from podspec

- [#588](https://github.com/callstack/repack/pull/588) [`b30bca0`](https://github.com/callstack/repack/commit/b30bca06e0d036e599ccf566cc7a50aa70fb8a51) Thanks [@jbroma](https://github.com/jbroma)! - Keep separate logs for compilation stats specific to each platform

- [#612](https://github.com/callstack/repack/pull/612) [`b6eb0ea`](https://github.com/callstack/repack/commit/b6eb0ea5b5722627abd4cb904970c3ee910ee657) Thanks [@jbroma](https://github.com/jbroma)! - Update templates to include `.cjs` and `.mjs` extensions

- [#579](https://github.com/callstack/repack/pull/579) [`06a4da8`](https://github.com/callstack/repack/commit/06a4da81ba661105da6c03ef254f2baf7daeaa1b) Thanks [@jbroma](https://github.com/jbroma)! - Include `NativeScriptManger.ts` in distributed files for codegen

- [#574](https://github.com/callstack/repack/pull/574) [`bab94bf`](https://github.com/callstack/repack/commit/bab94bf0a4092c3e34a33dff6f160b4e6dbd45a5) Thanks [@jbroma](https://github.com/jbroma)! - Fix dev server crash caused by uninitialized progress senders

- [#555](https://github.com/callstack/repack/pull/555) [`8fe92be`](https://github.com/callstack/repack/commit/8fe92bedc65c1757f3105d21d4c498cf17327ee7) Thanks [@jbroma](https://github.com/jbroma)! - Fix `getDirname` utility function on Windows

- [#596](https://github.com/callstack/repack/pull/596) [`b5ae6ac`](https://github.com/callstack/repack/commit/b5ae6ac2a678e384c7f93421997107de106ca735) Thanks [@jbroma](https://github.com/jbroma)! - Fix crash when using Node >= 21 for bundling in development

- [#556](https://github.com/callstack/repack/pull/556) [`6c09015`](https://github.com/callstack/repack/commit/6c09015c1afe3ac2d932dad5ed158165fd548c87) Thanks [@jbroma](https://github.com/jbroma)! - Update `webpack.config` templates

- [#515](https://github.com/callstack/repack/pull/515) [`ee1cc79`](https://github.com/callstack/repack/commit/ee1cc7994cd1ae75d7a35faae6e0ac3ea36059b8) Thanks [@jbroma](https://github.com/jbroma)! - Use `done` hook inside of `OutputPlugin`

- [#572](https://github.com/callstack/repack/pull/572) [`b134936`](https://github.com/callstack/repack/commit/b1349360db91a4f52489880cc12dd895850b6339) Thanks [@jbroma](https://github.com/jbroma)! - Always match .json extension last during module resolution

- [#464](https://github.com/callstack/repack/pull/464) [`72c770b`](https://github.com/callstack/repack/commit/72c770bb4ac5540a3c73cf244ca861069a37b045) Thanks [@jbroma](https://github.com/jbroma)! - Upgrade TypeScript, ESLint, TypeDoc in the repository

## 4.0.0-rc.2

### Minor Changes

- [#582](https://github.com/callstack/repack/pull/582) [`24585c0`](https://github.com/callstack/repack/commit/24585c07429533a0543eb61426771d196bdee0f1) Thanks [@jbroma](https://github.com/jbroma)! - use `localhost` as a defined default for the dev-server

### Patch Changes

- [#580](https://github.com/callstack/repack/pull/580) [`b6c68dc`](https://github.com/callstack/repack/commit/b6c68dc08a463880f2869610648336bc7e764a41) Thanks [@jbroma](https://github.com/jbroma)! - Fix: make `callstack-repack` pod compatible with use_frameworks!

- [#579](https://github.com/callstack/repack/pull/579) [`06a4da8`](https://github.com/callstack/repack/commit/06a4da81ba661105da6c03ef254f2baf7daeaa1b) Thanks [@jbroma](https://github.com/jbroma)! - Fix: include `NativeScriptManger.ts` for codegen

- [#574](https://github.com/callstack/repack/pull/574) [`bab94bf`](https://github.com/callstack/repack/commit/bab94bf0a4092c3e34a33dff6f160b4e6dbd45a5) Thanks [@jbroma](https://github.com/jbroma)! - Fix dev server crash caused by uninitialized progress senders

- [#572](https://github.com/callstack/repack/pull/572) [`b134936`](https://github.com/callstack/repack/commit/b1349360db91a4f52489880cc12dd895850b6339) Thanks [@jbroma](https://github.com/jbroma)! - Fix: always match .json extension last

- Updated dependencies []:
  - @callstack/repack-dev-server@4.0.0-rc.2

## 4.0.0-rc.1

### Patch Changes

- [#555](https://github.com/callstack/repack/pull/555) [`8fe92be`](https://github.com/callstack/repack/commit/8fe92bedc65c1757f3105d21d4c498cf17327ee7) Thanks [@jbroma](https://github.com/jbroma)! - Fix getDirname on Windows

- [#556](https://github.com/callstack/repack/pull/556) [`6c09015`](https://github.com/callstack/repack/commit/6c09015c1afe3ac2d932dad5ed158165fd548c87) Thanks [@jbroma](https://github.com/jbroma)! - Update webpack.config templates

- Updated dependencies [[`ed82e29`](https://github.com/callstack/repack/commit/ed82e29c2871411fd73616f29a7d4b75ff3dd913)]:
  - @callstack/repack-dev-server@4.0.0-rc.1

## 4.0.0-rc.0

### Major Changes

- [#430](https://github.com/callstack/repack/pull/430) [`0d96b11`](https://github.com/callstack/repack/commit/0d96b11ff3a6e2c21eb622e21ff7947db29a3272) Thanks [@jbroma](https://github.com/jbroma)! - BREAKING CHANGE:

  Upgrade to Node 18, drop support for Node 16.

- [#530](https://github.com/callstack/repack/pull/530) [`470a7c1`](https://github.com/callstack/repack/commit/470a7c1da6043904c82f53c2a0c82e73c438299a) Thanks [@jbroma](https://github.com/jbroma)! - BREAKING CHANGE:

  `ReactRefreshPlugin` was removed.

  If you were using `ReactRefreshPlugin`, please switch to `DevelopmentPlugin` moving forward.
  Users of `RepackPlugin` can continue as is, with no changes required.

- [#435](https://github.com/callstack/repack/pull/435) [`63d973f`](https://github.com/callstack/repack/commit/63d973ff4bae6f30f50a39a9f49095be4ce52967) Thanks [@jbroma](https://github.com/jbroma)! - BREAKING CHANGE:

  CodeSigningPlugin no longer accepts `outputPath` property as configuration option. Instead, it performs the code-signing in-place and integrates nicely with OutputPlugin.

- [#537](https://github.com/callstack/repack/pull/537) [`6fa32cb`](https://github.com/callstack/repack/commit/6fa32cb575ea2c845a700511669fdcb5124acc4d) Thanks [@jbroma](https://github.com/jbroma)! - BREAKING CHANGE:

  Re.Pack commands now override the default `start` and `bundle` CLI commands for enhanced functionality and compatibility with `react-native` versions >= 0.74. For earlier versions of `react-native` (< 0.74), the traditional commands `webpack-start` and `webpack-bundle` remain available and recommended.

  This change primarily impacts setups where both Metro and Re.Pack are used simultaneously.

  To maintain your current workflow without adopting these overrides, especially to avoid conflicts in projects using both Metro and Re.Pack, you can opt out by filtering out the new command names and reverting to the legacy `webpack` prefixed commands:

  ```js
  // react-native.config.js
  const commands = require("@callstack/repack/commands");

  module.exports = {
    commands: commands.filter((command) => command.name.startsWith("webpack")),
  };
  ```

  Additionally, this update ensures that running `react-native run-ios` or `react-native run-android` will launch the Re.Pack dev server by default instead of the Metro dev server.

- [#525](https://github.com/callstack/repack/pull/525) [`a74930b`](https://github.com/callstack/repack/commit/a74930bd4b5d704d35e182f7ddfea340a0a07793) Thanks [@jbroma](https://github.com/jbroma)! - BREAKING CHANGE:

  `getResolveOptions` is now way more compatible with `metro-resolver` and `@react-native/metro-config`

  1. `getResolveOptions` now accepts a second optional parameter called options with the following properties:
     - `enablePackageExports` - defaults to `false`
     - `preferNativePlatform` - defaults to `true`
  2. Order of extensions was changed to match the order from `@react-native/metro-config`.
  3. Resolution via Package Exports (`exports` field in package.json) is now optional and disabled by default.
     It can now be enabled via `getResolveOptions` options parameter. This change was introduced to match `metro` defaults.
  4. Default `conditionNames` are now: `['require', 'import', 'react-native']` and match `@react-native/metro-config` defaults.

- [#495](https://github.com/callstack/repack/pull/495) [`50a7257`](https://github.com/callstack/repack/commit/50a7257f1da9af44c5b6690c31408607d358b2e5) Thanks [@troZee](https://github.com/troZee)! - Support for New Architecture

### Minor Changes

- [#539](https://github.com/callstack/repack/pull/539) [`8270cb7`](https://github.com/callstack/repack/commit/8270cb7e2ccce9e2020517216e72302b6ba5833a) Thanks [@jbroma](https://github.com/jbroma)! - OutputPlugin now supports configuration with empty object as compilation entry.

### Patch Changes

- [#491](https://github.com/callstack/repack/pull/491) [`ebf1b19`](https://github.com/callstack/repack/commit/ebf1b19976edc603ebe4de992665d10a5bc30eaa) Thanks [@hosseinmd](https://github.com/hosseinmd)! - log error before exit when compilation has error

- [#499](https://github.com/callstack/repack/pull/499) [`15ffcba`](https://github.com/callstack/repack/commit/15ffcbabd9c9f0dadc3d91489d3b76c4cd80155f) Thanks [@jbroma](https://github.com/jbroma)! - Support non-classic(pnpm) paths to HMRClient from react-native

- [#496](https://github.com/callstack/repack/pull/496) [`a59b8ed`](https://github.com/callstack/repack/commit/a59b8ed4adab99f5e10024ae6f24ad18cdad791e) Thanks [@krozniata](https://github.com/krozniata)! - Remove duplicated React-Core dependency from podspec

- [#515](https://github.com/callstack/repack/pull/515) [`ee1cc79`](https://github.com/callstack/repack/commit/ee1cc7994cd1ae75d7a35faae6e0ac3ea36059b8) Thanks [@jbroma](https://github.com/jbroma)! - Use `done` hook inside of `OutputPlugin`

- [#464](https://github.com/callstack/repack/pull/464) [`72c770b`](https://github.com/callstack/repack/commit/72c770bb4ac5540a3c73cf244ca861069a37b045) Thanks [@jbroma](https://github.com/jbroma)! - chore: upgrade TypeScript, ESLint, TypeDoc

- Updated dependencies [[`0d96b11`](https://github.com/callstack/repack/commit/0d96b11ff3a6e2c21eb622e21ff7947db29a3272), [`72c770b`](https://github.com/callstack/repack/commit/72c770bb4ac5540a3c73cf244ca861069a37b045)]:
  - @callstack/repack-dev-server@4.0.0-rc.0

## 3.7.0

### Minor Changes

- [#477](https://github.com/callstack/repack/pull/477) [`e1476e6`](https://github.com/callstack/repack/commit/e1476e644c1da9cee5bc933b32219027248bd5af) Thanks [@szymonrybczak](https://github.com/szymonrybczak)! - fix: get commands options and description from new package (support RN>=0.73)

### Patch Changes

- [#479](https://github.com/callstack/repack/pull/479) [`b1ad518`](https://github.com/callstack/repack/commit/b1ad518a7ff76e5ffe95a9af02469cc74b99584e) Thanks [@ambar](https://github.com/ambar)! - Added the ability to fully leverage the webpack built-in caching mechanism to optimise cold build times.

- Updated dependencies [[`cc997a2`](https://github.com/callstack/repack/commit/cc997a2f84b4835f8fe597487b0cde6f41b4b7f0)]:
  - @callstack/repack-dev-server@1.1.0

## 3.6.0

### Minor Changes

- [#457](https://github.com/callstack/repack/pull/457) [`74de630`](https://github.com/callstack/repack/commit/74de630d4a27215580e6f835b6204757f2998a5a) Thanks [@jbroma](https://github.com/jbroma)! - Support lazy-compilation for dynamic imports

## 3.5.1

### Patch Changes

- [#444](https://github.com/callstack/repack/pull/444) [`88dc11f`](https://github.com/callstack/repack/commit/88dc11f575b0052aa37d692630cc3f1a6d9f0b3e) Thanks [@jbroma](https://github.com/jbroma)! - Fix ValidationError in ModuleFederationPlugin caused by reactNativeDeepImports prop

## 3.5.0

### Minor Changes

- [#265](https://github.com/callstack/repack/pull/265) [`a288e1a`](https://github.com/callstack/repack/commit/a288e1a2d65f0f9bd31f37df6d508125a7472bc7) Thanks [@justusburger](https://github.com/justusburger)! - Ensure file lists in manifests are sorted

* [#421](https://github.com/callstack/repack/pull/421) [`7deea25`](https://github.com/callstack/repack/commit/7deea25b426124209f131c09ee8549409b78fcc2) Thanks [@jbroma](https://github.com/jbroma)! - Add builtin support for react-native deep imports when using Module Federation

### Patch Changes

- [#422](https://github.com/callstack/repack/pull/422) [`430d6be`](https://github.com/callstack/repack/commit/430d6bee84402828404fc4e8883d4115813e5b8a) Thanks [@jbroma](https://github.com/jbroma)! - Fix inlining assets in react-native versions >= 0.72

* [#427](https://github.com/callstack/repack/pull/427) [`e86db86`](https://github.com/callstack/repack/commit/e86db86a3f5d2cf0dede85b471bdc6940c5f71ab) Thanks [@jbroma](https://github.com/jbroma)! - Improve performance of HMR

* [#343](https://github.com/callstack/repack/pull/343) [`0141fc1`](https://github.com/callstack/repack/commit/0141fc145c86ae164973f9267c0621ca2aadbed4) Thanks [@piccinnigius](https://github.com/piccinnigius)! - Fix ERR_UNSUPPORTED_ESM_URL_SCHEME on Windows

* Updated dependencies [[`a66785d`](https://github.com/callstack/repack/commit/a66785d4bdb629ab9abce2bf5fc0dc4b632072ef), [`719c2ef`](https://github.com/callstack/repack/commit/719c2ef3e1af0c82de8042de2c5c21ab88a287ea)]:
  - @callstack/repack-dev-server@1.0.2

## 3.4.0

### Minor Changes

- [#409](https://github.com/callstack/repack/pull/409) [`d4d7dc7`](https://github.com/callstack/repack/commit/d4d7dc7eaedfd3c6bdc31db7bb5f08495bbb81b0) Thanks [@jbroma](https://github.com/jbroma)! - Added enabled flag to CodeSigningPlugin, this is useful when you want to disable the plugin in development environment and only keep it in production. For now this flag defaults to true to prevent a breaking change.

* [#408](https://github.com/callstack/repack/pull/408) [`3bcce76`](https://github.com/callstack/repack/commit/3bcce76b61b2206efbbc76870a578c62a2e6a0a5) Thanks [@eps1lon](https://github.com/eps1lon)! - Allow storing compilation stats.

  You can now run `webpack-bundle` with `--json <file> --stats <preset>` (like with `webpack-cli`) to store compilation stats in the specified file.
  Compilation stats can be used to analyze the bundle (e.g. with [`webpack-bundle-analyzer`](https://github.com/webpack-contrib/webpack-bundle-analyzer) or https://statoscope.tech/).

## 3.3.1

### Patch Changes

- [#401](https://github.com/callstack/repack/pull/401) [`6171507`](https://github.com/callstack/repack/commit/6171507db6a1ebc067ab4be6ad3aa5b5cd1eb16b) Thanks [@jbroma](https://github.com/jbroma)! - Update nimbus-jose-jwt android dependency to address security vulnerabilites

## 3.3.0

### Minor Changes

- [#378](https://github.com/callstack/repack/pull/378) [`14afc61`](https://github.com/callstack/repack/commit/14afc61f1d5730164b1ccb483b5efb6b32b5a0ad) Thanks [@mikeduminy](https://github.com/mikeduminy)! - Add ChunksToHermesBytecodePlugin to transform all emitted chunks with Hermes

### Patch Changes

- [#391](https://github.com/callstack/repack/pull/391) [`0693fda`](https://github.com/callstack/repack/commit/0693fdaf33239f1d6ae28597bcc595f17aa8d4df) Thanks [@jbroma](https://github.com/jbroma)! - Fix: stricter versions for dependencies inside podspec

- [#365](https://github.com/callstack/repack/pull/365) [`cf6c77a`](https://github.com/callstack/repack/commit/cf6c77a675e00d98a4d906b56b3fd928c02ffb84) Thanks [@jbroma](https://github.com/jbroma)! - Updated getResolveOptions exposed by RePack to prefer 'default' condition over webpack's defaults ['require', 'node']

- [#382](https://github.com/callstack/repack/pull/382) [`c1a5a2b`](https://github.com/callstack/repack/commit/c1a5a2b403ed9b4a816465eba996f1655c21b718) Thanks [@jbroma](https://github.com/jbroma)! - Fixed and issue where URL for remote asset only included basename from publicPath

## 3.2.0

### Minor Changes

#### Code Signing:

- [#318](https://github.com/callstack/repack/pull/318) [`6e12c14`](https://github.com/callstack/repack/commit/6e12c14e02002721ad4fe3ddf41743dcdb597f60) Thanks [@jbroma](https://github.com/jbroma)! - Added CodeSigning abilities to RePack:
- [#348](https://github.com/callstack/repack/pull/348) [`76e98e9`](https://github.com/callstack/repack/commit/76e98e983842e5b1288c754d61ee2f3449762f2c) Thanks [@jbroma](https://github.com/jbroma)! - Embed code-signing signatures into the bundles:

  - Introduced `CodeSigningPlugin` for generating code-signed bundles
  - Implemented `CodeSigningUtils` extension for native part of the `ScriptManager` to verify signed bundles on Android and iOS

#### Remote Assets

- [#331](https://github.com/callstack/repack/pull/331) [`515fb05`](https://github.com/callstack/repack/commit/515fb05f307e10c9bf65fd54dce3e7ebb8d1ae45) Thanks [@jbroma](https://github.com/jbroma)! - Added remote-assets functionality to the assetsLoader

- [#328](https://github.com/callstack/repack/pull/328) [`4f155dd`](https://github.com/callstack/repack/commit/4f155ddf8f5064f60175ed2ee8f0ad64ff9f252b) Thanks [@jbroma](https://github.com/jbroma)! - Auto device scale resolution for inlined assets

### Patch Changes

- [#330](https://github.com/callstack/repack/pull/330) [`f142e06`](https://github.com/callstack/repack/commit/f142e068f473084f473089d71cba40ccbdd41b46) Thanks [@jbroma](https://github.com/jbroma)! - Code-Signing - move execution of the plugin to the later stage of compilation

* [#347](https://github.com/callstack/repack/pull/347) [`2180c09`](https://github.com/callstack/repack/commit/2180c09dd6acf738e5db5c2fdbbcfcf08f82993a) Thanks [@jbroma](https://github.com/jbroma)! - Fix OutputPlugin issue where chunks have no associated files with them

- [#327](https://github.com/callstack/repack/pull/327) [`23dfc55`](https://github.com/callstack/repack/commit/23dfc55dbcefff62493c51eed6f40b88b93a433d) Thanks [@jbroma](https://github.com/jbroma)! - Fix verifyScriptSignature missing a default value

## 3.2.0-rc.1

### Minor Changes

- [#331](https://github.com/callstack/repack/pull/331) [`515fb05`](https://github.com/callstack/repack/commit/515fb05f307e10c9bf65fd54dce3e7ebb8d1ae45) Thanks [@jbroma](https://github.com/jbroma)! - Added remote-assets functionality to the assetsLoader

* [#328](https://github.com/callstack/repack/pull/328) [`4f155dd`](https://github.com/callstack/repack/commit/4f155ddf8f5064f60175ed2ee8f0ad64ff9f252b) Thanks [@jbroma](https://github.com/jbroma)! - Auto device scale resolution for inlined assets

### Patch Changes

- [#330](https://github.com/callstack/repack/pull/330) [`f142e06`](https://github.com/callstack/repack/commit/f142e068f473084f473089d71cba40ccbdd41b46) Thanks [@jbroma](https://github.com/jbroma)! - Code-Signing - move execution of the plugin to the later stage of compilation

* [#327](https://github.com/callstack/repack/pull/327) [`23dfc55`](https://github.com/callstack/repack/commit/23dfc55dbcefff62493c51eed6f40b88b93a433d) Thanks [@jbroma](https://github.com/jbroma)! - Fix verifyScriptSignature missing a default value

## 3.2.0-rc.0

This Release candidate introduces a new feature – **Code Signing**. It allows you to sign your bundles during build time and verify them on the client side. This feature is currently in experimental mode and **the implementation is subject to change**. Once we are confident that the API is stable, we will release a stable version of this feature along the documentation and examples.

### Minor Changes

- [#318](https://github.com/callstack/repack/pull/318) [`6e12c14`](https://github.com/callstack/repack/commit/6e12c14e02002721ad4fe3ddf41743dcdb597f60) Thanks [@jbroma](https://github.com/jbroma)! - Added CodeSigning abilities to RePack:

  - Introduced CodeSigningPlugin for generating code-signing mapping files
  - Implemented CodeSigningUtils extension for ScriptManager to verify signed bundles on Android and iOS

## 3.1.1

### Patch Changes

- [#308](https://github.com/callstack/repack/pull/308) [`ad9581a`](https://github.com/callstack/repack/commit/ad9581a6d690b128991a9d64374ecb4b8d49c413) Thanks [@jbroma](https://github.com/jbroma)! - Make all packages compatible with Node v18

* [#302](https://github.com/callstack/repack/pull/302) [`d73eff4`](https://github.com/callstack/repack/commit/d73eff4216c88f1473c8da6703f8e4ff6edab029) Thanks [@kerm1it](https://github.com/kerm1it)! - Fix #251 - restore working React Devtools

* Updated dependencies [[`ad9581a`](https://github.com/callstack/repack/commit/ad9581a6d690b128991a9d64374ecb4b8d49c413)]:
  - @callstack/repack-dev-server@1.0.1

## 3.1.0

### Minor Changes

- [#287](https://github.com/callstack/repack/pull/287) [`47bdd09`](https://github.com/callstack/repack/commit/47bdd09f22e1ebf9cdfc29f0bb157a68f7af5b44) Thanks [@andrewworld](https://github.com/andrewworld)!

  A new optional callback `shouldUpdateScript` was added. It could be passed into so-called _locator_ config in `addResolver` callback function return statement. Its main usage would be to ask a user whether they want to download the latest update of Federated Scripts or not (for example – if they are not connected to wifi and they would rather save their cellular data).

  ```
  shouldUpdateScript?: (
      scriptId?: string,
      caller?: string,
      isScriptCacheOutdated?: boolean
  ) => Promise<boolean> | boolean;
  ```

  More info and a set of examples describing what are the intended usages of this API will be published soon in a form of a guide in Repack docs. For now, if you're interested in playing with this API please refer to the linked PR or to the [API docs](https://re-pack.netlify.app/docs/api/repack/client/interfaces/ScriptLocator#shouldupdatescript)

### Patch Changes

- [#293](https://github.com/callstack/repack/pull/293) [`7eeca5e`](https://github.com/callstack/repack/commit/7eeca5ed2619e7678ef88d8fb45735c14f1ecc75) Thanks [@RafikiTiki](https://github.com/RafikiTiki)! - Removed usage of deprecated jcenter repository from `build.gradle`.

* [#288](https://github.com/callstack/repack/pull/288) [`7e0092e`](https://github.com/callstack/repack/commit/7e0092e9554e26a1de405261fb56c1e6b886e261) Thanks [@RafikiTiki](https://github.com/RafikiTiki)! - Fix [#258](https://github.com/callstack/repack/issues/293) – previously `entryName` config value was not passed from `RepackPlugin` to the `OutputPlugin`.

- [#294](https://github.com/callstack/repack/pull/294) [`28cc721`](https://github.com/callstack/repack/commit/28cc721e8d6ac085bc66c47e627633046cb0d644) Thanks [@RafikiTiki](https://github.com/RafikiTiki)! - Updated kotlin-gradle-plugin version used by Repack to `1.7.0`.

## 3.0.1

### Patch Changes

#### Windows related issues:

- Fix for path formatting on Windows platform breaking `assetsCache` in development Compiler

  - [#256](https://github.com/callstack/repack/pull/256) [`7348b56`](https://github.com/callstack/repack/commit/7348b5628158e11c617e4499095fd108a3740a03) Thanks [@meypod](https://github.com/meypod)! - Fix assetsCache miss on Windows
  - [#276](https://github.com/callstack/repack/pull/276) [`a15e881`](https://github.com/callstack/repack/commit/a15e8816c640c6627ef3ebb5a9d18b58f7178c6f) Thanks [@RafikiTiki](https://github.com/RafikiTiki)! - Fix: assetsCache not available on Windows platform due to problem with path encoding

- [#255](https://github.com/callstack/repack/pull/255) [`d974069`](https://github.com/callstack/repack/commit/d974069ab2e7abee2a4b7103a8a86fe476fc122a) Thanks [@meypod](https://github.com/meypod)! - Fix v3 `debugger-app` not working on Windows platform

#### Quality of life improvements:

- [#252](https://github.com/callstack/repack/pull/252) [`c654c87`](https://github.com/callstack/repack/commit/c654c877a080cb6226b10da26b0aa55a2360198b) Thanks [@jbinda](https://github.com/jbinda)! - Exit with non-zero exit code if compilation has errors

- [#268](https://github.com/callstack/repack/pull/268) [`aeebc70`](https://github.com/callstack/repack/commit/aeebc703cd0a2c102b85241d5180d7577a2899c5) Thanks [@robik](https://github.com/robik)! - Raise an error on missing native module

## 3.0.0

### Major Changes

- [#186](https://github.com/callstack/repack/pull/186) [`05d126e`](https://github.com/callstack/repack/commit/05d126e63802f0702a9e353e762f8b6a77fcd73e) Thanks [@zamotany](https://github.com/zamotany)! - ### `ScriptManager`

  Refactored `ChunkManager` into `ScriptManager`:

  - `ChunkManager.configure(...)` got replaced with `new ScriptManager(...)`
  - Config option `resolveRemoteChunks` was renamed to `resolve`
  - Config option `forceRemoteChunkResolution` was removed - all resolution goes through `resolve`, regardless of the type
  - `ChunkManager.loadChunk` was renamed to `ScriptManager.loadScript`
  - `ChunkManager.preloadChunk` was renamed to `ScriptManager.prefetchScript`
  - `ChunkManager.invalidateChunks` was renamed to `ScriptManager.invalidateScripts`
  - Converted `ScriptManager` to be an Event Emitter with the following events:
    - `loading`
    - `loaded`
    - `resolving`
    - `resolved`
    - `prefetching`
    - `error`
  - Native module name - `ChunkManager` was renamed to `ScriptManager`
  - Added utilities for writing `resolve` implementation:
    - `Script.getDevSeverURL(scriptId)`
    - `Script.getRemoteURL(url)`
    - `Script.getFileSystemURL(scriptId)`
  - `chunkId` and `parentChunkId` were replaced by `scriptId` and `caller`

  ### Webpack config improvements

  - All Repack plugins are consolidated under single `RepackPlugin`, all sub-plugins are available under `plugins`:

    ```ts
    import * as Repack from "@callstack/repack";

    new Repack.plugins.AssetResolverPlugin();
    ```

  - Added support for CJS and ESM versions of Webpack config.
  - Added CJS and ESM templates for Webpack config.

  Default Webpack config lookup paths:

  - `webpack.config.mjs`
  - `webpack.config.cjs`
  - `webpack.config.js`
  - `.webpack/webpack.config.mjs`
  - `.webpack/webpack.config.cjs`
  - `.webpack/webpack.config.js`
  - `.webpack/webpackfile`

  ### CLI

  - Added `--silent` option to `webpack-start` command to silent all logs.
  - Added `--log-file <path>` option to `webpack-start` command to log all messages to a file.
  - Added `--json` `webpack-start` command to log all messages as JSON.

### Minor Changes

- [#202](https://github.com/callstack/repack/pull/202) [`fa097f7`](https://github.com/callstack/repack/commit/fa097f7a089221c11a60d8137368bf0e83f38230) Thanks [@zamotany](https://github.com/zamotany)! - ### ScriptManager

  - Added ability to provide multiple resolvers to `ScriptManager` using `ScriptManager.shared.addResolver`.
  - Removed `ScriptManager.configure` and split the functionality into `ScriptManager.shared.setStore` and `ScriptManager.shared.addResolver`.
  - Added methods to remove a single resolver and to remove all resolver.
  - Returning `undefined` from a resolver will cause next resolver in line to be used (as long as other resolver were added), if no resolver processed the request the error is thrown.

  Example:

  ```js
  ScriptManager.shared.setStorage(AsyncStorage);
  ScriptManager.shared.addResolver(async (scriptId, caller) => {
    /* ... */
  });
  ```

* [#237](https://github.com/callstack/repack/pull/237) [`9960a7b`](https://github.com/callstack/repack/commit/9960a7b5a39c4cb4caed4fc365a72f5ac3329e60) Thanks [@jbinda](https://github.com/jbinda)! - Expose `--reverse-port` argument in start command to fix dev server on Android

- [#189](https://github.com/callstack/repack/pull/189) [`bc42023`](https://github.com/callstack/repack/commit/bc420236687047752cf1ee42204b2f510aec144a) Thanks [@zamotany](https://github.com/zamotany)! - ### Development server API

  Added implementation for API functionalities in `@callstack/repack-dev-server`:

  - `GET /api/platforms` - List all platforms with active compilations
  - `GET /api/:platform/assets` - List all assets (`name` and `size`) for a given compilation
  - `GET /api/:platform/stats` - Get Webpack compilation stats
  - Websocket server under `/api` URI for logs and compilations events

* [#160](https://github.com/callstack/repack/pull/160) [`b088203`](https://github.com/callstack/repack/commit/b08820302e7eadfb38a3d0be24a1ed79ad458dfa) Thanks [@TMaszko](https://github.com/TMaszko)! - ### Assets loader

  By default, `@callstack/repack/assets-loader` will extract assets - meaning, they will be put in dedicated files and bundled together with the application.

  Inlined assets, however, are encoded as `base64` string into a data URI. Inlined assets are stored inside the actual JavaScript bundle - no dedicated files will be emitted
  for them.

  - Add `inline: boolean` option to `@callstack/repack/assets-loader`.
  - Add support for calculating `width`, `height` and `scale` for inlined assets.
  - Add support for inlining multiple scales.

- [#211](https://github.com/callstack/repack/pull/211) [`b588690`](https://github.com/callstack/repack/commit/b588690f3da905944abbe2da1fb5a8633bec9a43) Thanks [@zamotany](https://github.com/zamotany)! - **Custom Module Federation plugin - `Repack.plugins.ModuleFederationPlugin`**

  Add custom `ModuleFederationPlugin` plugin with defaults for React Native, automatic `remotes`
  conversion to `promise new Promise` (via `Federated.createRemote`) and support for `remote@location` syntax.

  For example, instead of using `webpack.container.ModuleFederationPlugin`, you can now use:

  ```js
  import * as Repack from "@callstack/repack";

  new Repack.plugins.ModuleFederationPlugin({
    name: "host",
  });

  new Repack.plugins.ModuleFederationPlugin({
    name: "app1",
    remotes: {
      module1: "module1@https://example.com/module1.container.bundle",
    },
  });

  new Repack.plugins.ModuleFederationPlugin({
    name: "app2",
    remotes: {
      module1: "module1@https://example.com/module1.container.bundle",
      module2: "module1@dynamic",
    },
  });
  ```

  **Priority for resolvers in `ScriptManager`**

  To support `remote@location` in `Repack.plugins.ModuleFederationPlugin`/`Federated.createRemote`, when adding
  a resolver using `ScriptManager.shared.addResolver` you can optionally specify priority of that resolver.
  By default all resolvers have priority of `2`.

  When using `remote@location` syntax with valid URL as `location` (eg `module1@https://example.com/module1.container.bundle`), a default resolver for the container and it's chunks will be added with priority `0`.
  If you want to overwrite it, add new resolver with higher priority.

  To specify custom priority use 2nd options argument:

  ```js
  import { ScriptManager } from "@callstack/repack/client";

  ScriptManager.shared.addResolver(
    async (scriptId, caller) => {
      // ...
    },
    { priority: 1 },
  ); // Default priority is `2`.
  ```

### Patch Changes

- [#198](https://github.com/callstack/repack/pull/198) [`96a6b27`](https://github.com/callstack/repack/commit/96a6b2711c93973569c170a181a0c808724fb8ca) Thanks [@ScriptedAlchemy](https://github.com/ScriptedAlchemy)! - ### Module Federation

  Keep track of initialized remote containers to prevent performance degradation and crashes.

* [#233](https://github.com/callstack/repack/pull/233) [`4bfeab1`](https://github.com/callstack/repack/commit/4bfeab131e3c3bca17a3b27247953d2c7adbd965) Thanks [@jbinda](https://github.com/jbinda)! - Pass `SHARE_ENV` to Worker to keep process envs from parent process

- [#188](https://github.com/callstack/repack/pull/188) [`78ae409`](https://github.com/callstack/repack/commit/78ae409c7ab281bd2ba2c581e7b21a7971992d24) Thanks [@zamotany](https://github.com/zamotany)! - ### HMR

  - Upgraded `@pmmmwh/react-refresh-webpack-plugin` to `0.5.7` and added `react-refresh@^0.14.0` as a `@callstack/repack` dependency.
  - `RepackTargetPlugin` now requires to pass `hmr?: boolean` property to a constructor - only relevant, if you're **not** using `RepackPlugin`.

* [#209](https://github.com/callstack/repack/pull/209) [`ecf7829`](https://github.com/callstack/repack/commit/ecf78293def2150f960873eda9a7d25a61908b5c) Thanks [@zamotany](https://github.com/zamotany)! - ### Fix `importModule` crashing the app

  Prevent `importModule` from crashing with _cannot read property \_\_isInitialized of undefined_.

- [#207](https://github.com/callstack/repack/pull/207) [`4e15c38`](https://github.com/callstack/repack/commit/4e15c380fc2ff9aad1f300e5960e14d67557f6ce) Thanks [@jbinda](https://github.com/jbinda)! - ### Fix bi-directional imports in Module Federation

  `Federated.createRemote` and `Federated.importModule` now load and evaluate each container only once to support bi-directional
  container imports and cycling dependencies.

- Updated dependencies [[`bc42023`](https://github.com/callstack/repack/commit/bc420236687047752cf1ee42204b2f510aec144a), [`e6dc69d`](https://github.com/callstack/repack/commit/e6dc69d35f287af08d09944edd8e6d12f28484cf), [`b913b89`](https://github.com/callstack/repack/commit/b913b8981334854cc13076af2a9c8a12bc465d1b), [`05d126e`](https://github.com/callstack/repack/commit/05d126e63802f0702a9e353e762f8b6a77fcd73e), [`6d65156`](https://github.com/callstack/repack/commit/6d65156366bc88edefdae7a3d0310ddbcdf48886), [`c75cdc7`](https://github.com/callstack/repack/commit/c75cdc7a44351bb4702232e603031e2880f2839d)]:
  - @callstack/repack-dev-server@1.0.0

## 3.0.0-next.8

### Minor Changes

- [#237](https://github.com/callstack/repack/pull/237) [`9960a7b`](https://github.com/callstack/repack/commit/9960a7b5a39c4cb4caed4fc365a72f5ac3329e60) Thanks [@jbinda](https://github.com/jbinda)! - Expose `--reverse-port` argument in start command to fix dev server on Android

### Patch Changes

- [#233](https://github.com/callstack/repack/pull/233) [`4bfeab1`](https://github.com/callstack/repack/commit/4bfeab131e3c3bca17a3b27247953d2c7adbd965) Thanks [@jbinda](https://github.com/jbinda)! - Pass `SHARE_ENV` to Worker to keep process envs from parent process

- Updated dependencies [[`e6dc69d`](https://github.com/callstack/repack/commit/e6dc69d35f287af08d09944edd8e6d12f28484cf), [`b913b89`](https://github.com/callstack/repack/commit/b913b8981334854cc13076af2a9c8a12bc465d1b), [`6d65156`](https://github.com/callstack/repack/commit/6d65156366bc88edefdae7a3d0310ddbcdf48886)]:
  - @callstack/repack-dev-server@1.0.0-next.3

## 3.0.0-next.7

### Minor Changes

- [#211](https://github.com/callstack/repack/pull/211) [`b588690`](https://github.com/callstack/repack/commit/b588690f3da905944abbe2da1fb5a8633bec9a43) Thanks [@zamotany](https://github.com/zamotany)! - **Custom Module Federation plugin - `Repack.plugins.ModuleFederationPlugin`**

  Add custom `ModuleFederationPlugin` plugin with defaults for React Native, automatic `remotes`
  conversion to `promise new Promise` (via `Federated.createRemote`) and support for `remote@location` syntax.

  For example, instead of using `webpack.container.ModuleFederationPlugin`, you can now use:

  ```js
  import * as Repack from "@callstack/repack";

  new Repack.plugins.ModuleFederationPlugin({
    name: "host",
  });

  new Repack.plugins.ModuleFederationPlugin({
    name: "app1",
    remotes: {
      module1: "module1@https://example.com/module1.container.bundle",
    },
  });

  new Repack.plugins.ModuleFederationPlugin({
    name: "app2",
    remotes: {
      module1: "module1@https://example.com/module1.container.bundle",
      module2: "module1@dynamic",
    },
  });
  ```

  **Priority for resolvers in `ScriptManager`**

  To support `remote@location` in `Repack.plugins.ModuleFederationPlugin`/`Federated.createRemote`, when adding
  a resolver using `ScriptManager.shared.addResolver` you can optionally specify priority of that resolver.
  By default all resolvers have priority of `2`.

  When using `remote@location` syntax with valid URL as `location` (eg `module1@https://example.com/module1.container.bundle`), a default resolver for the container and it's chunks will be added with priority `0`.
  If you want to overwrite it, add new resolver with higher priority.

  To specify custom priority use 2nd options argument:

  ```js
  import { ScriptManager } from "@callstack/repack/client";

  ScriptManager.shared.addResolver(
    async (scriptId, caller) => {
      // ...
    },
    { priority: 1 },
  ); // Default priority is `2`.
  ```

## 3.0.0-next.6

### Patch Changes

- [#209](https://github.com/callstack/repack/pull/209) [`ecf7829`](https://github.com/callstack/repack/commit/ecf78293def2150f960873eda9a7d25a61908b5c) Thanks [@zamotany](https://github.com/zamotany)! - ### Fix `importModule` crashing the app

  Prevent `importModule` from crashing with _cannot read property \_\_isInitialized of undefined_.

* [#207](https://github.com/callstack/repack/pull/207) [`4e15c38`](https://github.com/callstack/repack/commit/4e15c380fc2ff9aad1f300e5960e14d67557f6ce) Thanks [@jbinda](https://github.com/jbinda)! - ### Fix bi-directional imports in Module Federation

  `Federated.createRemote` and `Federated.importModule` now load and evaluate each container only once to support bi-directional
  container imports and cycling dependencies.

## 3.0.0-next.5

### Minor Changes

- [#202](https://github.com/callstack/repack/pull/202) [`fa097f7`](https://github.com/callstack/repack/commit/fa097f7a089221c11a60d8137368bf0e83f38230) Thanks [@zamotany](https://github.com/zamotany)! - ### ScriptManager

  - Added ability to provide multiple resolvers to `ScriptManager` using `ScriptManager.shared.addResolver`.
  - Removed `ScriptManager.configure` and split the functionality into `ScriptManager.shared.setStore` and `ScriptManager.shared.addResolver`.
  - Added methods to remove a single resolver and to remove all resolver.
  - Returning `undefined` from a resolver will cause next resolver in line to be used (as long as other resolver were added), if no resolver processed the request the error is thrown.

  Example:

  ```js
  ScriptManager.shared.setStorage(AsyncStorage);
  ScriptManager.shared.addResolver(async (scriptId, caller) => {
    /* ... */
  });
  ```

## 3.0.0-next.4

### Patch Changes

- [#198](https://github.com/callstack/repack/pull/198) [`96a6b27`](https://github.com/callstack/repack/commit/96a6b2711c93973569c170a181a0c808724fb8ca) Thanks [@ScriptedAlchemy](https://github.com/ScriptedAlchemy)! - ### Module Federation

  Keep track of initialized remote containers to prevent performance degradation and crashes.

- Updated dependencies [[`c75cdc7`](https://github.com/callstack/repack/commit/c75cdc7a44351bb4702232e603031e2880f2839d)]:
  - @callstack/repack-dev-server@1.0.0-next.2

## 3.0.0-next.3

### Minor Changes

- [#160](https://github.com/callstack/repack/pull/160) [`b088203`](https://github.com/callstack/repack/commit/b08820302e7eadfb38a3d0be24a1ed79ad458dfa) Thanks [@TMaszko](https://github.com/TMaszko)! - ### Assets loader

  By default, `@callstack/repack/assets-loader` will extract assets - meaning, they will be put in dedicated files and bundled together with the application.

  Inlined assets, however, are encoded as `base64` string into a data URI. Inlined assets are stored inside the actual JavaScript bundle - no dedicated files will be emitted
  for them.

  - Add `inline: boolean` option to `@callstack/repack/assets-loader`.
  - Add support for calculating `width`, `height` and `scale` for inlined assets.
  - Add support for inlining multiple scales.

## 3.0.0-next.2

### Minor Changes

- ### Development server API

  Added implementation for API functionalities in `@callstack/repack-dev-server`:

  - `GET /api/platforms` - List all platforms with active compilations
  - `GET /api/:platform/assets` - List all assets (`name` and `size`) for a given compilation
  - `GET /api/:platform/stats` - Get Webpack compilation stats
  - Websocket server under `/api` URI for logs and compilations events

### Patch Changes

- Updated dependencies []:
  - @callstack/repack-dev-server@1.0.0-next.1

## 3.0.0-next.1

### Patch Changes

- ### HMR

  - Upgraded `@pmmmwh/react-refresh-webpack-plugin` to `0.5.7` and added `react-refresh@^0.14.0` as a `@callstack/repack` dependency.
  - `RepackTargetPlugin` now requires to pass `hmr?: boolean` property to a constructor - only relevant, if you're **not** using `RepackPlugin`.

## 3.0.0-next.0

### Major Changes

- ### `ScriptManager`

  Refactored `ChunkManager` into `ScriptManager`:

  - `ChunkManager.configure(...)` got replaced with `new ScriptManager(...)`
  - Config option `resolveRemoteChunks` was renamed to `resolve`
  - Config option `forceRemoteChunkResolution` was removed - all resolution goes through `resolve`, regardless of the type
  - `ChunkManager.loadChunk` was renamed to `ScriptManager.loadScript`
  - `ChunkManager.preloadChunk` was renamed to `ScriptManager.prefetchScript`
  - `ChunkManager.invalidateChunks` was renamed to `ScriptManager.invalidateScripts`
  - Converted `ScriptManager` to be an Event Emitter with the following events:
    - `loading`
    - `loaded`
    - `resolving`
    - `resolved`
    - `prefetching`
    - `error`
  - Native module name - `ChunkManager` was renamed to `ScriptManager`
  - Added utilities for writing `resolve` implementation:
    - `Script.getDevSeverURL(scriptId)`
    - `Script.getRemoteURL(url)`
    - `Script.getFileSystemURL(scriptId)`
  - `chunkId` and `parentChunkId` were replaced by `scriptId` and `caller`

  ### Webpack config improvements

  - All Repack plugins are consolidated under single `RepackPlugin`, all sub-plugins are available under `plugins`:

    ```ts
    import * as Repack from "@callstack/repack";

    new Repack.plugins.AssetResolverPlugin();
    ```

  - Added support for CJS and ESM versions of Webpack config.
  - Added CJS and ESM templates for Webpack config.

  Default Webpack config lookup paths:

  - `webpack.config.mjs`
  - `webpack.config.cjs`
  - `webpack.config.js`
  - `.webpack/webpack.config.mjs`
  - `.webpack/webpack.config.cjs`
  - `.webpack/webpack.config.js`
  - `.webpack/webpackfile`

  ### CLI

  - Added `--silent` option to `webpack-start` command to silent all logs.
  - Added `--log-file <path>` option to `webpack-start` command to log all messages to a file.
  - Added `--json` `webpack-start` command to log all messages as JSON.

### Patch Changes

- Updated dependencies []:
  - @callstack/repack-dev-server@1.0.0-next.0
