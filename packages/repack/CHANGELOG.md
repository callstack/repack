# @callstack/repack

## 5.0.3

### Patch Changes

- [#1085](https://github.com/callstack/repack/pull/1085) [`c2852df`](https://github.com/callstack/repack/commit/c2852dfb261b0321e7fb6a12bdfc6f1ef7e479d2) Thanks [@jbroma](https://github.com/jbroma)! - Fix emitting to the same file when developing a host-type app with module-federation

- [#1086](https://github.com/callstack/repack/pull/1086) [`8e8aad6`](https://github.com/callstack/repack/commit/8e8aad6cfe0669ef01d7071e86a680a498e1b811) Thanks [@jbroma](https://github.com/jbroma)! - Hide "JavaScriptLogs have moved..." message

- [#1087](https://github.com/callstack/repack/pull/1087) [`2f0835a`](https://github.com/callstack/repack/commit/2f0835a64740a570e1fb82c23d0a08fb789a7489) Thanks [@jbroma](https://github.com/jbroma)! - Drop having `@react-native-community/cli` as peer dependency

- Updated dependencies [[`8e8aad6`](https://github.com/callstack/repack/commit/8e8aad6cfe0669ef01d7071e86a680a498e1b811)]:
  - @callstack/repack-dev-server@5.0.3

## 5.0.2

### Patch Changes

- [#1081](https://github.com/callstack/repack/pull/1081) [`30d7330`](https://github.com/callstack/repack/commit/30d73301971ee27efabd7e8c8d9549dd94b38b69) Thanks [@jbroma](https://github.com/jbroma)! - Drop dependency on `@react-native-community/cli-server-api` in the DevServer

- Updated dependencies [[`30d7330`](https://github.com/callstack/repack/commit/30d73301971ee27efabd7e8c8d9549dd94b38b69)]:
  - @callstack/repack-dev-server@5.0.2

## 5.0.1

### Patch Changes

- [#1075](https://github.com/callstack/repack/pull/1075) [`dac01e4`](https://github.com/callstack/repack/commit/dac01e41d539f19fe9ab8800288eadb361444ed0) Thanks [@szymonrybczak](https://github.com/szymonrybczak)! - Use default publicPath in development instead of enforcing it in DevelopmentPlugin

- [#1074](https://github.com/callstack/repack/pull/1074) [`54fa1cd`](https://github.com/callstack/repack/commit/54fa1cdb0a2e09c8de476290beacedbf3a5f7d85) Thanks [@szymonrybczak](https://github.com/szymonrybczak)! - Remove enforcement of output filenames in dev mode

- [#1065](https://github.com/callstack/repack/pull/1065) [`e08a805`](https://github.com/callstack/repack/commit/e08a805a2190d33fb605c5603759245ff9d965a2) Thanks [@jbroma](https://github.com/jbroma)! - Fix normalization of resolve.extensions with [platform] placeholder & set publicPath to noop explicitly when using deprecated getPublicPath helper function

- Updated dependencies []:
  - @callstack/repack-dev-server@5.0.1

## 5.0.0

### Major Changes

- [#977](https://github.com/callstack/repack/pull/977) [`e12f63d`](https://github.com/callstack/repack/commit/e12f63d1ca1cc54f28015b390ea4cef92af429b1) Thanks [@jbroma](https://github.com/jbroma)! - BREAKING: `config.devtool` is now used to control the behaviour of generated sourcemaps. To enable sourcemaps again, please remove `devtool: false` from your config or set it explicitly to one of valid values (e.g. `source-map`).

  Introduced a dedicated `SourceMapPlugin` that consolidates sourcemap configuration and improves sourcemap handling by relying on the `devtool` option. The plugin is part of the Repack plugin and does not need to be added separately.

- [#780](https://github.com/callstack/repack/pull/780) [`e937211`](https://github.com/callstack/repack/commit/e93721194e3d8eae64fa5da6f5e296378ad407e9) Thanks [@jbroma](https://github.com/jbroma)! - Removed `--silent` CLI flag for start command.

  For silencing output, you can use shell redirection instead:

  - Unix/macOS: `npx react-native start > /dev/null 2>&1`
  - Windows: `npx react-native start > nul 2>&1`

- [#825](https://github.com/callstack/repack/pull/825) [`18f2eef`](https://github.com/callstack/repack/commit/18f2eef7dbb2a79e709c1810c69a34b0a0fe9004) Thanks [@jbroma](https://github.com/jbroma)! - Removed `--reverse-port` CLI option and replaced it with `--no-reverse-port` CLI option.

- [#912](https://github.com/callstack/repack/pull/912) [`07d0566`](https://github.com/callstack/repack/commit/07d05663b9b758001e390635f75097b85a8b2436) Thanks [@jbroma](https://github.com/jbroma)! - BREAKING CHANGES: Removed `devServerEnabled` option from assets-loader and `devServer` from Repack plugin configuration - they are now obtained automatically from configuration.

  Added new `config.devServer` field to configure development server properties with type-safe http/https configuration, special host values (local-ip, local-ipv4, local-ipv6), and enhanced HTTPS configuration with full HttpsServerOptions support.

- [#987](https://github.com/callstack/repack/pull/987) [`97cd8e8`](https://github.com/callstack/repack/commit/97cd8e85146ad2dbc8110952c1447884a84194fc) Thanks [@jbroma](https://github.com/jbroma)! - BREAKING CHANGES: `bundleFilename`, `sourceMapFilename`, and `assetsPath` have been removed from both `OutputPlugin` and `RepackPlugin` configurations. These properties are now controlled only through their respective CLI flags.

- [#975](https://github.com/callstack/repack/pull/975) [`7c9232c`](https://github.com/callstack/repack/commit/7c9232c0dfbd5ab35277262037bb8a356db448d8) Thanks [@jbroma](https://github.com/jbroma)! - Deprecate `getPublicPath` utility. The `getPublicPath` function is now a no-op marked as deprecated, while public path configuration is handled automatically under the hood.

- [#976](https://github.com/callstack/repack/pull/976) [`c29ba2f`](https://github.com/callstack/repack/commit/c29ba2f616328d34670f661336d3c43b4ca2ef3e) Thanks [@jbroma](https://github.com/jbroma)! - BREAKING: Simplified RepackPlugin configuration by removing `context`, `mode`, and `sourceMaps` options in favor of using values from Rspack/webpack configuration.

  Made `platform` and `output` options optional (they are now inferred automatically). The plugin configuration object is now entirely optional, allowing for minimal setup with `new Repack.RepackPlugin()`.

- [#720](https://github.com/callstack/repack/pull/720) [`a7b557e`](https://github.com/callstack/repack/commit/a7b557ed162166d9bc152b06d8be3169a0a2a176) Thanks [@jbroma](https://github.com/jbroma)! - Support for Rspack & Webpack simultaneously

- [#958](https://github.com/callstack/repack/pull/958) [`1bf1b1c`](https://github.com/callstack/repack/commit/1bf1b1cb830008167bce913745dade8186281608) Thanks [@jbroma](https://github.com/jbroma)! - BREAKING CHANGE: Added a strict configuration cascade system (CLI Flags -> Config Values -> Command Defaults -> Webpack/Rspack Defaults) to provide clear and predictable configuration resolution.

  CLI arguments now always take highest precedence and cannot be overridden by config files, ensuring consistent behavior across all commands.

- [#786](https://github.com/callstack/repack/pull/786) [`cf42d14`](https://github.com/callstack/repack/commit/cf42d149ca1ccb8caae9085ab7710ff7b603a9d0) Thanks [@jbroma](https://github.com/jbroma)! - Enable new debugger (React Native DevTools) by default, remove support for legacy remote debugging

- [#962](https://github.com/callstack/repack/pull/962) [`22d0e8f`](https://github.com/callstack/repack/commit/22d0e8faaeae221ace87f01a5fca639b4524fcbf) Thanks [@jbroma](https://github.com/jbroma)! - BREAKING CHANGES: Removed `entryName` config option from `DevelopmentPlugin`, `OutputPlugin` and `RepackPlugin` - it is now obtained automatically from configuration

### Minor Changes

- [#817](https://github.com/callstack/repack/pull/817) [`c97da24`](https://github.com/callstack/repack/commit/c97da241876ec8dbe6c2d206590d697f429e86b4) Thanks [@jbroma](https://github.com/jbroma)! - Add Repack Reanimated Plugin which integrates react-native-reanimated into the project

- [#674](https://github.com/callstack/repack/pull/674) [`9f4ad85`](https://github.com/callstack/repack/commit/9f4ad85648f02a127113e7c56d726a923cc0dc12) Thanks [@jbroma](https://github.com/jbroma)! - Add support for Module Federation V2

- [#1021](https://github.com/callstack/repack/pull/1021) [`a87576b`](https://github.com/callstack/repack/commit/a87576b90e3dcad62d5f126ec22f7a867aab35ef) Thanks [@jbroma](https://github.com/jbroma)! - Make iOS ScriptConfig properties non-atomic for better performance

- [#784](https://github.com/callstack/repack/pull/784) [`f8af03c`](https://github.com/callstack/repack/commit/f8af03cd231c3d95a92099719d827e368f707b5c) Thanks [@zmzlois](https://github.com/zmzlois)! - add `react-native-linear-gradient` to flow type module loading rule support

- [#778](https://github.com/callstack/repack/pull/778) [`2344162`](https://github.com/callstack/repack/commit/23441620335e91382dda01d0cc06278efede45cf) Thanks [@jbroma](https://github.com/jbroma)! - Add `--config` option to commands, deprecate `--webpackConfig` option

- [#810](https://github.com/callstack/repack/pull/810) [`46330d7`](https://github.com/callstack/repack/commit/46330d70db99a372046baf8ee4565e4a21e5b4f3) Thanks [@jbroma](https://github.com/jbroma)! - Include `@rspack/plugin-react-refresh` with Re.Pack instead of requiring user to install it

- [#981](https://github.com/callstack/repack/pull/981) [`05183a8`](https://github.com/callstack/repack/commit/05183a8644e4f1c0d7f8b9261192dcb72231c267) Thanks [@jbroma](https://github.com/jbroma)! - Resolve `[platform]` & `[context]` placeholders in `config.output.path`

- [#997](https://github.com/callstack/repack/pull/997) [`bff2947`](https://github.com/callstack/repack/commit/bff2947dfad5dcd23d39dbdcfcb455529934d967) Thanks [@jbroma](https://github.com/jbroma)! - Added `getAssetTransformRules` utility function to simplify setting up asset transformation rules in both Webpack and Rspack projects.

- [#981](https://github.com/callstack/repack/pull/981) [`05183a8`](https://github.com/callstack/repack/commit/05183a8644e4f1c0d7f8b9261192dcb72231c267) Thanks [@jbroma](https://github.com/jbroma)! - Add config defaults for `config.output` and `config.optimization`

- [#765](https://github.com/callstack/repack/pull/765) [`efff0c2`](https://github.com/callstack/repack/commit/efff0c29801db04eddbbc8f3776cb3e56457f585) Thanks [@jbroma](https://github.com/jbroma)! - Add default rules for transpiling popular flow typed packages

- [#985](https://github.com/callstack/repack/pull/985) [`2cfd84f`](https://github.com/callstack/repack/commit/2cfd84f8bcf6e7c241aab3e24cde97e7e85afbc5) Thanks [@jbroma](https://github.com/jbroma)! - Assets loader can now be called without specyifing platform explicitly - the platform is now inferred automatically from configuration

- [#872](https://github.com/callstack/repack/pull/872) [`0e600d4`](https://github.com/callstack/repack/commit/0e600d4d8df577622ba8cbc49ff1ef80f257620d) Thanks [@jbroma](https://github.com/jbroma)! - Enable inlining entry modules by making runtime initialization from React renderers a no-op

- [#702](https://github.com/callstack/repack/pull/702) [`495203d`](https://github.com/callstack/repack/commit/495203dc3a1d219aea623afe99912957d8f0e0a1) Thanks [@jbroma](https://github.com/jbroma)! - Enable dev-server to serve source assets alongside build artifacts

- [#763](https://github.com/callstack/repack/pull/763) [`e433584`](https://github.com/callstack/repack/commit/e4335840a4b1ed59affc89375988ba6a9db57891) Thanks [@thiagobrez](https://github.com/thiagobrez)! - Add getModulePaths utility to generate include and exclude paths for modules in the bundler config

- [#828](https://github.com/callstack/repack/pull/828) [`b1a010a`](https://github.com/callstack/repack/commit/b1a010a7dd8af5612759e134249ae0587e42aef7) Thanks [@jbroma](https://github.com/jbroma)! - Run adb reverse for all available devices by default

- [#1024](https://github.com/callstack/repack/pull/1024) [`5e68814`](https://github.com/callstack/repack/commit/5e688146c2da861d5fcf0e647e0a1e386f38a4cf) Thanks [@borisyankov](https://github.com/borisyankov)! - Show a gradient logo of Re.Pack, version number, and the bundler being used

- [#1005](https://github.com/callstack/repack/pull/1005) [`4e10aa6`](https://github.com/callstack/repack/commit/4e10aa6a0c198823bf1b682d9d2e87c39657ac65) Thanks [@jbroma](https://github.com/jbroma)! - Reworked DevServer HMR pipeline - improved performance & recovery from errors

- [#841](https://github.com/callstack/repack/pull/841) [`d9d64ef`](https://github.com/callstack/repack/commit/d9d64ef6438e75086bd970cd600e936e46e7962f) Thanks [@borisyankov](https://github.com/borisyankov)! - Add support for NativeWind through a dedicated optional plugin called `@callstack/repack-plugin-nativewind`

- [#757](https://github.com/callstack/repack/pull/757) [`8a90731`](https://github.com/callstack/repack/commit/8a9073146c6541ed374541b9bcf9ebe3c4f70e9a) Thanks [@artus9033](https://github.com/artus9033)! - Display list of available interactions on dev server startup & add support for 'j' to debug

- [#828](https://github.com/callstack/repack/pull/828) [`b1a010a`](https://github.com/callstack/repack/commit/b1a010a7dd8af5612759e134249ae0587e42aef7) Thanks [@jbroma](https://github.com/jbroma)! - Wait for android device before running adb reverse when starting dev-server

- [#984](https://github.com/callstack/repack/pull/984) [`1f470a1`](https://github.com/callstack/repack/commit/1f470a11e93f8af22badbafc47256db3a32ecac8) Thanks [@jbroma](https://github.com/jbroma)! - `getResolveOptions` can be now called without any params and the `platform` extensions will be resolved automatically. This makes `getResolveOptions` useful when used in static configs where `platform` variable isn't exposed.

- [#967](https://github.com/callstack/repack/pull/967) [`3f22966`](https://github.com/callstack/repack/commit/3f22966db4ce43f89d7e544d1a24234ed117480d) Thanks [@jbroma](https://github.com/jbroma)! - Use own custom ReactRefreshLoader in all configurations (Rspack & webpack)

- [#1023](https://github.com/callstack/repack/pull/1023) [`f690120`](https://github.com/callstack/repack/commit/f69012062335824521a332233f0de6fae5d14ca2) Thanks [@jbroma](https://github.com/jbroma)! - Rename ChunksToHermesBytecodePlugin to HermesBytecodePlugin

- [#753](https://github.com/callstack/repack/pull/753) [`176324a`](https://github.com/callstack/repack/commit/176324a8d09d34dd1fbc68e0e227640834138f5a) Thanks [@artus9033](https://github.com/artus9033)! - Add support for React Native 0.76

- [#869](https://github.com/callstack/repack/pull/869) [`30fa495`](https://github.com/callstack/repack/commit/30fa4955008460fc94926a8d2cefb2efbd198cb5) Thanks [@jbroma](https://github.com/jbroma)! - Use `@react-native-community/cli` explictly iOS project settings (through `CLI_PATH`).

  Drop (unofficial) support for modyfing Android config for RN versions < 0.71.

- [#877](https://github.com/callstack/repack/pull/877) [`919ffb8`](https://github.com/callstack/repack/commit/919ffb869588cef0eb120e5195d16952e0e45808) Thanks [@szymonrybczak](https://github.com/szymonrybczak)! - Add prompt for choosing the bundler in `repack-init`

- [#750](https://github.com/callstack/repack/pull/750) [`c4a3235`](https://github.com/callstack/repack/commit/c4a32354feaccdfda8570b6a065dc6f7a6b9f6d0) Thanks [@jbroma](https://github.com/jbroma)! - Normalize filepath & ensure path exists when writing stats to a file

- [#865](https://github.com/callstack/repack/pull/865) [`3bfb690`](https://github.com/callstack/repack/commit/3bfb6909d7363787bbfd1584e1749b4ff516aa92) Thanks [@jbroma](https://github.com/jbroma)! - Add CodegenPlugin as part of RepackPlugin to handle React Native Codegen babel transforms

- [#991](https://github.com/callstack/repack/pull/991) [`c36f778`](https://github.com/callstack/repack/commit/c36f77838d59f0692171f7114ac68fa11e4a3100) Thanks [@jbroma](https://github.com/jbroma)! - Added `getJsTransformRules` utility function to simplify setting up JavaScript transformation rules in Rspack for React Native projects.

- [#816](https://github.com/callstack/repack/pull/816) [`6ed9a6f`](https://github.com/callstack/repack/commit/6ed9a6fcb40ba946b39dfe1d302ad2ebf9dffacf) Thanks [@jbroma](https://github.com/jbroma)! - Support platform specific assets

- [#824](https://github.com/callstack/repack/pull/824) [`8cf7cc3`](https://github.com/callstack/repack/commit/8cf7cc3622ad85cf093005c5c55c8dd63940a57b) Thanks [@jbroma](https://github.com/jbroma)! - Added `adb reverse` interaction & `adb reverse` command is now run by default when bundling for Android

- [#893](https://github.com/callstack/repack/pull/893) [`aa3802f`](https://github.com/callstack/repack/commit/aa3802f8a9a06c3cbcaa932ea45cf27f2a523927) Thanks [@jbroma](https://github.com/jbroma)! - Prettify `repack-init` and make it behave similarly to other tools in the ecosystem

- [#734](https://github.com/callstack/repack/pull/734) [`b455503`](https://github.com/callstack/repack/commit/b4555030b7827e14084db282accd138945d532c5) Thanks [@hexboy](https://github.com/hexboy)! - Add a mechanism for retrying downloads of scripts through `retry` and `retryDelay` properties

- [#855](https://github.com/callstack/repack/pull/855) [`6421e0b`](https://github.com/callstack/repack/commit/6421e0b9b5a91116bad280bae9462f6974f66caa) Thanks [@borisyankov](https://github.com/borisyankov)! - Optimize 'checkIfCacheDataOutdated' to do as few comparisons as possible

- [#864](https://github.com/callstack/repack/pull/864) [`5aa009c`](https://github.com/callstack/repack/commit/5aa009c9ea1fada2572813effc0d88499a509c0f) Thanks [@jbroma](https://github.com/jbroma)! - Make babel-loader a dependecy

- [#901](https://github.com/callstack/repack/pull/901) [`3515dd6`](https://github.com/callstack/repack/commit/3515dd689f78f26215d4a4ee9b46a432fad1e8cc) Thanks [@jbroma](https://github.com/jbroma)! - Normalize compiler.name to always be equal to the target platform across all commands

- [#896](https://github.com/callstack/repack/pull/896) [`44273d2`](https://github.com/callstack/repack/commit/44273d2d064ed91f6e6a4ce7dc8c56d8c7de1b88) Thanks [@jbroma](https://github.com/jbroma)! - Add support for Expo Modules through a dedicated optional plugin called @callstack/repack-plugin-expo-modules

- [#803](https://github.com/callstack/repack/pull/803) [`daffbf7`](https://github.com/callstack/repack/commit/daffbf72088ba666d956e35a265546a89ee84f42) Thanks [@jbroma](https://github.com/jbroma)! - Refactor FederationRuntimePlugin into two separate plugins for more granular control over the MF2 runtime behaviour (CorePlugin & ResolverPlugin)

### Patch Changes

- [#776](https://github.com/callstack/repack/pull/776) [`31d0e32`](https://github.com/callstack/repack/commit/31d0e32e6a4b9aa9d9d0fbd3f1ddd18e95a16757) Thanks [@jbroma](https://github.com/jbroma)! - Fix peer dependency config for @rspack/core in repack package

- [#1028](https://github.com/callstack/repack/pull/1028) [`2abcc60`](https://github.com/callstack/repack/commit/2abcc6060764501f6076bfb196e0b1e84f7af326) Thanks [@jbroma](https://github.com/jbroma)! - Fix HermesBytecodePlugin failing when used with ModuleFederationV2Plugin

- [#775](https://github.com/callstack/repack/pull/775) [`76738de`](https://github.com/callstack/repack/commit/76738de12fdf29f5af78aaa23f03337c33c7926a) Thanks [@jbroma](https://github.com/jbroma)! - Fix customization of MF1 federated entry filename

- [#870](https://github.com/callstack/repack/pull/870) [`abf190e`](https://github.com/callstack/repack/commit/abf190e7e2571b3ef66cba9d26dd65d1548e4ab7) Thanks [@jbroma](https://github.com/jbroma)! - Install latest version of `@rspack/core` with repack-init

- [#787](https://github.com/callstack/repack/pull/787) [`acdd0c8`](https://github.com/callstack/repack/commit/acdd0c801ab611a25164fce5302e20e61ae25292) Thanks [@jbroma](https://github.com/jbroma)! - Fix sourceURL of bundles so source maps can be matched in dev tools

- [#1055](https://github.com/callstack/repack/pull/1055) [`8f8928e`](https://github.com/callstack/repack/commit/8f8928ea9cd5b0713bfddb1e4c3e0df670e21000) Thanks [@jbroma](https://github.com/jbroma)! - Fix an issue where normalizing config would override a field on object from other config

- [#869](https://github.com/callstack/repack/pull/869) [`30fa495`](https://github.com/callstack/repack/commit/30fa4955008460fc94926a8d2cefb2efbd198cb5) Thanks [@jbroma](https://github.com/jbroma)! - Add `--config-cmd` to options for bundle command for compatibility with RN >= 0.76

- [#856](https://github.com/callstack/repack/pull/856) [`9570c83`](https://github.com/callstack/repack/commit/9570c83918348a38f2fd01385755e9da0ef6fc08) Thanks [@jbroma](https://github.com/jbroma)! - Fix loading of 2nd level Module Federation 2 remotes

- [#956](https://github.com/callstack/repack/pull/956) [`1945e75`](https://github.com/callstack/repack/commit/1945e75eeb126f8d5bef318cf9571c420f7b3406) Thanks [@szymonrybczak](https://github.com/szymonrybczak)! - Deprecate `--webpackConfig` in `start` command and make deprecation warning more informative

- [#908](https://github.com/callstack/repack/pull/908) [`1953287`](https://github.com/callstack/repack/commit/19532876fb8bfbf271db552d983f12e5c26fc58a) Thanks [@jbroma](https://github.com/jbroma)! - Add `react-native-camera` and `react-native-view-shot` to flow libs

- [#883](https://github.com/callstack/repack/pull/883) [`2e953c5`](https://github.com/callstack/repack/commit/2e953c56157dad3e131be25e2eeb93ddf60919ed) Thanks [@jbroma](https://github.com/jbroma)! - Fix crash when warning without moduleDescriptor was being thrown

- [#842](https://github.com/callstack/repack/pull/842) [`d8eb77e`](https://github.com/callstack/repack/commit/d8eb77e1ebade637d96e44a8b8f3bf0eaf00846b) Thanks [@jbroma](https://github.com/jbroma)! - Fix missing apply on ProvidePlugin for React Refresh Utils in DevelopmentPlugin

- [#960](https://github.com/callstack/repack/pull/960) [`07b2e20`](https://github.com/callstack/repack/commit/07b2e2059487f0b6962b05016e7f1453ba35c379) Thanks [@jbroma](https://github.com/jbroma)! - Remove the workaround for reordering entry dependencies when using ModuleFederation

- [#821](https://github.com/callstack/repack/pull/821) [`287991e`](https://github.com/callstack/repack/commit/287991eb002725f78c23aafe89131fcadb8edaf1) Thanks [@jbroma](https://github.com/jbroma)! - Ignore irrelevant MF2 runtime warning about request of a dependency being an expression

- [#711](https://github.com/callstack/repack/pull/711) [`7af6d5b`](https://github.com/callstack/repack/commit/7af6d5bad8288ea58dd246243fe96439709cbe97) Thanks [@jbroma](https://github.com/jbroma)! - fix: always use URL from Script config as `sourceUrl` when evaluating bundles on Android

- [#766](https://github.com/callstack/repack/pull/766) [`206d76f`](https://github.com/callstack/repack/commit/206d76f30a4858680839fa53b9f8a3a2070ed9f8) Thanks [@jbroma](https://github.com/jbroma)! - Fix handling of cjs,mjs,cts,mts files when transpiling node modules with swc

- [#799](https://github.com/callstack/repack/pull/799) [`f801083`](https://github.com/callstack/repack/commit/f801083f7ba616e77fa77c1c6321875de6886388) Thanks [@jbroma](https://github.com/jbroma)! - Expose MF2 config property to external tooling

- [#880](https://github.com/callstack/repack/pull/880) [`cdfdca4`](https://github.com/callstack/repack/commit/cdfdca4aa481020d4b2cbd260297e39984384d1c) Thanks [@jbroma](https://github.com/jbroma)! - Fix swc loader module rules loose mode configuration

- [#950](https://github.com/callstack/repack/pull/950) [`580bf30`](https://github.com/callstack/repack/commit/580bf306ba9f9cd1d3dfed0227aad64abd1c3752) Thanks [@szymonrybczak](https://github.com/szymonrybczak)! - Don't error on missing `--entry-file` when entry is defined in `rspack.config.js` or `webpack.config.js`.

- [#980](https://github.com/callstack/repack/pull/980) [`01d9583`](https://github.com/callstack/repack/commit/01d9583cada929a16b6d40c6476f0508847b0fff) Thanks [@jbroma](https://github.com/jbroma)! - Normalize the configs after merging them with the defaults and CLI overrides

- [#829](https://github.com/callstack/repack/pull/829) [`617c501`](https://github.com/callstack/repack/commit/617c5018e1f2b0520f6f978b2c1440239196f662) Thanks [@jbroma](https://github.com/jbroma)! - Fix early JS errors not being displayed in LogBox

- [#835](https://github.com/callstack/repack/pull/835) [`ae89e38`](https://github.com/callstack/repack/commit/ae89e38fd13fab7c133f8e1c68bc7f02f5cdf04d) Thanks [@mrsasuu](https://github.com/mrsasuu)! - Fix ScriptManager import path in MF runtime plugins (CorePlugin & ResolverPlugin)

- [#988](https://github.com/callstack/repack/pull/988) [`de82bbf`](https://github.com/callstack/repack/commit/de82bbf232331666e7739adc8a5e69133dde2e3e) Thanks [@jbroma](https://github.com/jbroma)! - Remove unused `platform` param from LoggerPlugin

- [#871](https://github.com/callstack/repack/pull/871) [`93f2c74`](https://github.com/callstack/repack/commit/93f2c745092ae83e31bc1ac9fe5c89a5b64c495f) Thanks [@jbroma](https://github.com/jbroma)! - Add error boundary around webpack's require function to match Metro's error handling behavior more closely

- [#755](https://github.com/callstack/repack/pull/755) [`90faeeb`](https://github.com/callstack/repack/commit/90faeeb7d6be9ddf5aa74c9552df01ec58d5372c) Thanks [@jbroma](https://github.com/jbroma)! - Disable package imports by default

- [#989](https://github.com/callstack/repack/pull/989) [`88474ea`](https://github.com/callstack/repack/commit/88474ea1d52267df6a7187c280b793f516ffdfb0) Thanks [@jbroma](https://github.com/jbroma)! - Make `platform` option of DevelopmentPlugin optional

- [#944](https://github.com/callstack/repack/pull/944) [`928a493`](https://github.com/callstack/repack/commit/928a493ead0f77cab7f1031e2df0b63f8ed65137) Thanks [@szymonrybczak](https://github.com/szymonrybczak)! - Add missing `try`/`catch` condition when opening React Native DevTools.

- [#843](https://github.com/callstack/repack/pull/843) [`3029ab6`](https://github.com/callstack/repack/commit/3029ab6d48312a51c19a257c11fcd02016a44af3) Thanks [@jbroma](https://github.com/jbroma)! - Fix missing config for swc loader rules

- [#779](https://github.com/callstack/repack/pull/779) [`679bcd8`](https://github.com/callstack/repack/commit/679bcd8917aca587c36d550101e9dd9578e1e172) Thanks [@jbroma](https://github.com/jbroma)! - More intuitive behaviour of `--verbose` flag in start command

- [#756](https://github.com/callstack/repack/pull/756) [`f119ab3`](https://github.com/callstack/repack/commit/f119ab3eb94eff9d2cc1aec8fcf9f835c3025abc) Thanks [@hosseinmd](https://github.com/hosseinmd)! - Prevent to loadScript which is already is loading
  issue: https://github.com/callstack/repack/issues/749

- [#868](https://github.com/callstack/repack/pull/868) [`96915f8`](https://github.com/callstack/repack/commit/96915f80b08e474127271475d132644efeab4bee) Thanks [@jbroma](https://github.com/jbroma)! - Decouple init & module error handling from load script runtime module inside RepackTargetPlugin

- [#892](https://github.com/callstack/repack/pull/892) [`3a68e15`](https://github.com/callstack/repack/commit/3a68e157a6a5e07dc2e0003ead02b8f965fd3d49) Thanks [@lukewalczak](https://github.com/lukewalczak)! - Require MF2 container name to be a valid JS identifier

- [#867](https://github.com/callstack/repack/pull/867) [`153d1d4`](https://github.com/callstack/repack/commit/153d1d4513498a85ccc7303222455c3372108406) Thanks [@ra1nj](https://github.com/ra1nj)! - Add 'react-native-inappbrowser-reborn' in flowTypedModulesLoadingRules.

- [#814](https://github.com/callstack/repack/pull/814) [`592fbe3`](https://github.com/callstack/repack/commit/592fbe3fe8eeeeb856d260c3106f5f6cd6eeaef8) Thanks [@jbroma](https://github.com/jbroma)! - Fix how size of a scaled assets is obtained (aligned with metro)

- [#1031](https://github.com/callstack/repack/pull/1031) [`5a6ebdc`](https://github.com/callstack/repack/commit/5a6ebdcaf0687bd6da9d2907638cd219daabcf39) Thanks [@jbroma](https://github.com/jbroma)! - Fix webpack start command looking for rspack configs

- [#808](https://github.com/callstack/repack/pull/808) [`f600e07`](https://github.com/callstack/repack/commit/f600e075645c5f310abe67591cbdf11221944cba) Thanks [@jbroma](https://github.com/jbroma)! - Fix type JSX runtime transform when transpiling node modules

- [#819](https://github.com/callstack/repack/pull/819) [`9890400`](https://github.com/callstack/repack/commit/9890400fe5ac750698ceb3eaf72e0b3a86ae4a73) Thanks [@jbroma](https://github.com/jbroma)! - Fix missing sourcemap generation for codegen related files and configure separate rules for ts & tsx files

- [#968](https://github.com/callstack/repack/pull/968) [`59d9d02`](https://github.com/callstack/repack/commit/59d9d02ecabf5caffa87c748aa0b92191d0f4e84) Thanks [@jbroma](https://github.com/jbroma)! - Add consitent plugin naming and error message formatting

- [#1033](https://github.com/callstack/repack/pull/1033) [`0be4198`](https://github.com/callstack/repack/commit/0be41980f2431d2a534e501062b10a08d3901f78) Thanks [@jbroma](https://github.com/jbroma)! - Fix OutputPlugin not picking up bundleOutput & sourcemapOutput args

- [#952](https://github.com/callstack/repack/pull/952) [`8301f5c`](https://github.com/callstack/repack/commit/8301f5c77d7e75c155cbb427b4ac380565e946f7) Thanks [@hosseinmd](https://github.com/hosseinmd)! - refactor Android's `RemoteScriptLoader.kt` to reuse `scriptsDir`

- [#820](https://github.com/callstack/repack/pull/820) [`39f80b3`](https://github.com/callstack/repack/commit/39f80b3661a348b9d778f76af2848ed615582d23) Thanks [@jbroma](https://github.com/jbroma)! - Ignore setUpTests warning from Reanimated by default

- [#949](https://github.com/callstack/repack/pull/949) [`a8560b9`](https://github.com/callstack/repack/commit/a8560b988cb2adfd8e23fcfdcdc783b860b07c8a) Thanks [@szymonrybczak](https://github.com/szymonrybczak)! - Improve error handling by hiding useless stack traces.

- [#955](https://github.com/callstack/repack/pull/955) [`49b8ddf`](https://github.com/callstack/repack/commit/49b8ddf1e58f0e59e8801692249e2a24df37cdf4) Thanks [@hosseinmd](https://github.com/hosseinmd)! - fix: download, write, run instead of download, write, read, run

- [#771](https://github.com/callstack/repack/pull/771) [`df1d587`](https://github.com/callstack/repack/commit/df1d587115abb61a7168d02d04e451ee3f8066de) Thanks [@hosseinmd](https://github.com/hosseinmd)! - script should be cached after successfully loaded

- Updated dependencies [[`07d0566`](https://github.com/callstack/repack/commit/07d05663b9b758001e390635f75097b85a8b2436), [`4e10aa6`](https://github.com/callstack/repack/commit/4e10aa6a0c198823bf1b682d9d2e87c39657ac65)]:
  - @callstack/repack-dev-server@5.0.0

## 5.0.0-rc.12

### Minor Changes

- [#1005](https://github.com/callstack/repack/pull/1005) [`4e10aa6`](https://github.com/callstack/repack/commit/4e10aa6a0c198823bf1b682d9d2e87c39657ac65) Thanks [@jbroma](https://github.com/jbroma)! - Reworked DevServer HMR pipeline - improved performance & recovery from errors

### Patch Changes

- Updated dependencies [[`4e10aa6`](https://github.com/callstack/repack/commit/4e10aa6a0c198823bf1b682d9d2e87c39657ac65)]:
  - @callstack/repack-dev-server@5.0.0-rc.12

## 5.0.0-rc.11

### Major Changes

- [#977](https://github.com/callstack/repack/pull/977) [`e12f63d`](https://github.com/callstack/repack/commit/e12f63d1ca1cc54f28015b390ea4cef92af429b1) Thanks [@jbroma](https://github.com/jbroma)! - BREAKING: `config.devtool` is now used to control the behaviour of generated sourcemaps. To enable sourcemaps again, please remove `devtool: false` from your config or set it explicitly to one of valid values (e.g. `source-map`).

  Introduced a dedicated `SourceMapPlugin` that consolidates sourcemap configuration and improves sourcemap handling by relying on the `devtool` option. The plugin is part of the Repack plugin and does not need to be added separately.

- [#912](https://github.com/callstack/repack/pull/912) [`07d0566`](https://github.com/callstack/repack/commit/07d05663b9b758001e390635f75097b85a8b2436) Thanks [@jbroma](https://github.com/jbroma)! - BREAKING CHANGES: Removed `devServerEnabled` option from assets-loader and `devServer` from Repack plugin configuration - they are now obtained automatically from configuration.

  Added new `config.devServer` field to configure development server properties with type-safe http/https configuration, special host values (local-ip, local-ipv4, local-ipv6), and enhanced HTTPS configuration with full HttpsServerOptions support.

- [#987](https://github.com/callstack/repack/pull/987) [`97cd8e8`](https://github.com/callstack/repack/commit/97cd8e85146ad2dbc8110952c1447884a84194fc) Thanks [@jbroma](https://github.com/jbroma)! - BREAKING CHANGES: `bundleFilename`, `sourceMapFilename`, and `assetsPath` have been removed from both `OutputPlugin` and `RepackPlugin` configurations. These properties are now controlled only through their respective CLI flags.

- [#975](https://github.com/callstack/repack/pull/975) [`7c9232c`](https://github.com/callstack/repack/commit/7c9232c0dfbd5ab35277262037bb8a356db448d8) Thanks [@jbroma](https://github.com/jbroma)! - Deprecate `getPublicPath` utility. The `getPublicPath` function is now a no-op marked as deprecated, while public path configuration is handled automatically under the hood.

- [#976](https://github.com/callstack/repack/pull/976) [`c29ba2f`](https://github.com/callstack/repack/commit/c29ba2f616328d34670f661336d3c43b4ca2ef3e) Thanks [@jbroma](https://github.com/jbroma)! - BREAKING: Simplified RepackPlugin configuration by removing `context`, `mode`, and `sourceMaps` options in favor of using values from Rspack/webpack configuration.

  Made `platform` and `output` options optional (they are now inferred automatically). The plugin configuration object is now entirely optional, allowing for minimal setup with `new Repack.RepackPlugin()`.

- [#958](https://github.com/callstack/repack/pull/958) [`1bf1b1c`](https://github.com/callstack/repack/commit/1bf1b1cb830008167bce913745dade8186281608) Thanks [@jbroma](https://github.com/jbroma)! - BREAKING CHANGE: Added a strict configuration cascade system (CLI Flags -> Config Values -> Command Defaults -> Webpack/Rspack Defaults) to provide clear and predictable configuration resolution.

  CLI arguments now always take highest precedence and cannot be overridden by config files, ensuring consistent behavior across all commands.

- [#962](https://github.com/callstack/repack/pull/962) [`22d0e8f`](https://github.com/callstack/repack/commit/22d0e8faaeae221ace87f01a5fca639b4524fcbf) Thanks [@jbroma](https://github.com/jbroma)! - BREAKING CHANGES: Removed `entryName` config option from `DevelopmentPlugin`, `OutputPlugin` and `RepackPlugin` - it is now obtained automatically from configuration

### Minor Changes

- [#981](https://github.com/callstack/repack/pull/981) [`05183a8`](https://github.com/callstack/repack/commit/05183a8644e4f1c0d7f8b9261192dcb72231c267) Thanks [@jbroma](https://github.com/jbroma)! - Resolve `[platform]` & `[context]` placeholders in `config.output.path`

- [#997](https://github.com/callstack/repack/pull/997) [`bff2947`](https://github.com/callstack/repack/commit/bff2947dfad5dcd23d39dbdcfcb455529934d967) Thanks [@jbroma](https://github.com/jbroma)! - Added `getAssetTransformRules` utility function to simplify setting up asset transformation rules in both Webpack and Rspack projects.

- [#981](https://github.com/callstack/repack/pull/981) [`05183a8`](https://github.com/callstack/repack/commit/05183a8644e4f1c0d7f8b9261192dcb72231c267) Thanks [@jbroma](https://github.com/jbroma)! - Add config defaults for `config.output` and `config.optimization`

- [#985](https://github.com/callstack/repack/pull/985) [`2cfd84f`](https://github.com/callstack/repack/commit/2cfd84f8bcf6e7c241aab3e24cde97e7e85afbc5) Thanks [@jbroma](https://github.com/jbroma)! - Assets loader can now be called without specyifing platform explicitly - the platform is now inferred automatically from configuration

- [#984](https://github.com/callstack/repack/pull/984) [`1f470a1`](https://github.com/callstack/repack/commit/1f470a11e93f8af22badbafc47256db3a32ecac8) Thanks [@jbroma](https://github.com/jbroma)! - `getResolveOptions` can be now called without any params and the `platform` extensions will be resolved automatically. This makes `getResolveOptions` useful when used in static configs where `platform` variable isn't exposed.

- [#967](https://github.com/callstack/repack/pull/967) [`3f22966`](https://github.com/callstack/repack/commit/3f22966db4ce43f89d7e544d1a24234ed117480d) Thanks [@jbroma](https://github.com/jbroma)! - Use own custom ReactRefreshLoader in all configurations (Rspack & webpack)

- [#991](https://github.com/callstack/repack/pull/991) [`c36f778`](https://github.com/callstack/repack/commit/c36f77838d59f0692171f7114ac68fa11e4a3100) Thanks [@jbroma](https://github.com/jbroma)! - Added `getJsTransformRules` utility function to simplify setting up JavaScript transformation rules in Rspack for React Native projects.

### Patch Changes

- [#956](https://github.com/callstack/repack/pull/956) [`1945e75`](https://github.com/callstack/repack/commit/1945e75eeb126f8d5bef318cf9571c420f7b3406) Thanks [@szymonrybczak](https://github.com/szymonrybczak)! - Deprecate `--webpackConfig` in `start` command and make deprecation warning more informative

- [#908](https://github.com/callstack/repack/pull/908) [`1953287`](https://github.com/callstack/repack/commit/19532876fb8bfbf271db552d983f12e5c26fc58a) Thanks [@jbroma](https://github.com/jbroma)! - Add `react-native-camera` and `react-native-view-shot` to flow libs

- [#960](https://github.com/callstack/repack/pull/960) [`07b2e20`](https://github.com/callstack/repack/commit/07b2e2059487f0b6962b05016e7f1453ba35c379) Thanks [@jbroma](https://github.com/jbroma)! - Remove the workaround for reordering entry dependencies when using ModuleFederation

- [#950](https://github.com/callstack/repack/pull/950) [`580bf30`](https://github.com/callstack/repack/commit/580bf306ba9f9cd1d3dfed0227aad64abd1c3752) Thanks [@szymonrybczak](https://github.com/szymonrybczak)! - Don't error on missing `--entry-file` when entry is defined in `rspack.config.js` or `webpack.config.js`.

- [#980](https://github.com/callstack/repack/pull/980) [`01d9583`](https://github.com/callstack/repack/commit/01d9583cada929a16b6d40c6476f0508847b0fff) Thanks [@jbroma](https://github.com/jbroma)! - Normalize the configs after merging them with the defaults and CLI overrides

- [#988](https://github.com/callstack/repack/pull/988) [`de82bbf`](https://github.com/callstack/repack/commit/de82bbf232331666e7739adc8a5e69133dde2e3e) Thanks [@jbroma](https://github.com/jbroma)! - Remove unused `platform` param from LoggerPlugin

- [#989](https://github.com/callstack/repack/pull/989) [`88474ea`](https://github.com/callstack/repack/commit/88474ea1d52267df6a7187c280b793f516ffdfb0) Thanks [@jbroma](https://github.com/jbroma)! - Make `platform` option of DevelopmentPlugin optional

- [#944](https://github.com/callstack/repack/pull/944) [`928a493`](https://github.com/callstack/repack/commit/928a493ead0f77cab7f1031e2df0b63f8ed65137) Thanks [@szymonrybczak](https://github.com/szymonrybczak)! - Add missing `try`/`catch` condition when opening React Native DevTools.

- [#968](https://github.com/callstack/repack/pull/968) [`59d9d02`](https://github.com/callstack/repack/commit/59d9d02ecabf5caffa87c748aa0b92191d0f4e84) Thanks [@jbroma](https://github.com/jbroma)! - Add consitent plugin naming and error message formatting

- [#952](https://github.com/callstack/repack/pull/952) [`8301f5c`](https://github.com/callstack/repack/commit/8301f5c77d7e75c155cbb427b4ac380565e946f7) Thanks [@hosseinmd](https://github.com/hosseinmd)! - refactor Android's `RemoteScriptLoader.kt` to reuse `scriptsDir`

- [#949](https://github.com/callstack/repack/pull/949) [`a8560b9`](https://github.com/callstack/repack/commit/a8560b988cb2adfd8e23fcfdcdc783b860b07c8a) Thanks [@szymonrybczak](https://github.com/szymonrybczak)! - Improve error handling by hiding useless stack traces.

- [#955](https://github.com/callstack/repack/pull/955) [`49b8ddf`](https://github.com/callstack/repack/commit/49b8ddf1e58f0e59e8801692249e2a24df37cdf4) Thanks [@hosseinmd](https://github.com/hosseinmd)! - fix: download, write, run instead of download, write, read, run

- Updated dependencies [[`07d0566`](https://github.com/callstack/repack/commit/07d05663b9b758001e390635f75097b85a8b2436)]:
  - @callstack/repack-dev-server@5.0.0-rc.11

## 5.0.0-rc.10

### Minor Changes

- [#901](https://github.com/callstack/repack/pull/901) [`3515dd6`](https://github.com/callstack/repack/commit/3515dd689f78f26215d4a4ee9b46a432fad1e8cc) Thanks [@jbroma](https://github.com/jbroma)! - Normalize compiler.name to always be equal to the target platform across all commands

- [#896](https://github.com/callstack/repack/pull/896) [`44273d2`](https://github.com/callstack/repack/commit/44273d2d064ed91f6e6a4ce7dc8c56d8c7de1b88) Thanks [@jbroma](https://github.com/jbroma)! - Add support for Expo Modules through a dedicated optional plugin called @callstack/repack-plugin-expo-modules

### Patch Changes

- Updated dependencies []:
  - @callstack/repack-dev-server@5.0.0-rc.10

## 5.0.0-rc.9

### Minor Changes

- [#890](https://github.com/callstack/repack/pull/890) [`361b7b9`](https://github.com/callstack/repack/commit/361b7b95c686912a0ed9e50e8cc18b0db2605309) Thanks [@ceopaludetto](https://github.com/ceopaludetto)! - Add cssInteropOptions to Nativewind plugin.

- [#893](https://github.com/callstack/repack/pull/893) [`aa3802f`](https://github.com/callstack/repack/commit/aa3802f8a9a06c3cbcaa932ea45cf27f2a523927) Thanks [@jbroma](https://github.com/jbroma)! - Prettify `repack-init` and make it behave similarly to other tools in the ecosystem

### Patch Changes

- [#892](https://github.com/callstack/repack/pull/892) [`3a68e15`](https://github.com/callstack/repack/commit/3a68e157a6a5e07dc2e0003ead02b8f965fd3d49) Thanks [@lukewalczak](https://github.com/lukewalczak)! - Require MF2 container name to be a valid JS identifier

- Updated dependencies []:
  - @callstack/repack-dev-server@5.0.0-rc.9

## 5.0.0-rc.8

### Minor Changes

- [#877](https://github.com/callstack/repack/pull/877) [`919ffb8`](https://github.com/callstack/repack/commit/919ffb869588cef0eb120e5195d16952e0e45808) Thanks [@szymonrybczak](https://github.com/szymonrybczak)! - Add prompt for choosing the bundler in `repack-init`

### Patch Changes

- [#883](https://github.com/callstack/repack/pull/883) [`2e953c5`](https://github.com/callstack/repack/commit/2e953c56157dad3e131be25e2eeb93ddf60919ed) Thanks [@jbroma](https://github.com/jbroma)! - Fix crash when warning without moduleDescriptor was being thrown

- Updated dependencies []:
  - @callstack/repack-dev-server@5.0.0-rc.8

## 5.0.0-rc.7

### Minor Changes

- [#872](https://github.com/callstack/repack/pull/872) [`0e600d4`](https://github.com/callstack/repack/commit/0e600d4d8df577622ba8cbc49ff1ef80f257620d) Thanks [@jbroma](https://github.com/jbroma)! - Enable inlining entry modules by making runtime initialization from React renderers a no-op

- [#841](https://github.com/callstack/repack/pull/841) [`d9d64ef`](https://github.com/callstack/repack/commit/d9d64ef6438e75086bd970cd600e936e46e7962f) Thanks [@borisyankov](https://github.com/borisyankov)! - Add support for NativeWind through a dedicated optional plugin called `@callstack/repack-plugin-nativewind`

- [#869](https://github.com/callstack/repack/pull/869) [`30fa495`](https://github.com/callstack/repack/commit/30fa4955008460fc94926a8d2cefb2efbd198cb5) Thanks [@jbroma](https://github.com/jbroma)! - Use `@react-native-community/cli` explictly iOS project settings (through `CLI_PATH`).

  Drop (unofficial) support for modyfing Android config for RN versions < 0.71.

- [#865](https://github.com/callstack/repack/pull/865) [`3bfb690`](https://github.com/callstack/repack/commit/3bfb6909d7363787bbfd1584e1749b4ff516aa92) Thanks [@jbroma](https://github.com/jbroma)! - Add CodegenPlugin as part of RepackPlugin to handle React Native Codegen babel transforms

- [#864](https://github.com/callstack/repack/pull/864) [`5aa009c`](https://github.com/callstack/repack/commit/5aa009c9ea1fada2572813effc0d88499a509c0f) Thanks [@jbroma](https://github.com/jbroma)! - Make babel-loader a dependecy

### Patch Changes

- [#870](https://github.com/callstack/repack/pull/870) [`abf190e`](https://github.com/callstack/repack/commit/abf190e7e2571b3ef66cba9d26dd65d1548e4ab7) Thanks [@jbroma](https://github.com/jbroma)! - Install latest version of `@rspack/core` with repack-init

- [#869](https://github.com/callstack/repack/pull/869) [`30fa495`](https://github.com/callstack/repack/commit/30fa4955008460fc94926a8d2cefb2efbd198cb5) Thanks [@jbroma](https://github.com/jbroma)! - Add `--config-cmd` to options for bundle command for compatibility with RN >= 0.76

- [#880](https://github.com/callstack/repack/pull/880) [`cdfdca4`](https://github.com/callstack/repack/commit/cdfdca4aa481020d4b2cbd260297e39984384d1c) Thanks [@jbroma](https://github.com/jbroma)! - Fix swc loader module rules loose mode configuration

- [#871](https://github.com/callstack/repack/pull/871) [`93f2c74`](https://github.com/callstack/repack/commit/93f2c745092ae83e31bc1ac9fe5c89a5b64c495f) Thanks [@jbroma](https://github.com/jbroma)! - Add error boundary around webpack's require function to match Metro's error handling behavior more closely

- [#868](https://github.com/callstack/repack/pull/868) [`96915f8`](https://github.com/callstack/repack/commit/96915f80b08e474127271475d132644efeab4bee) Thanks [@jbroma](https://github.com/jbroma)! - Decouple init & module error handling from load script runtime module inside RepackTargetPlugin

- [#867](https://github.com/callstack/repack/pull/867) [`153d1d4`](https://github.com/callstack/repack/commit/153d1d4513498a85ccc7303222455c3372108406) Thanks [@ra1nj](https://github.com/ra1nj)! - Add 'react-native-inappbrowser-reborn' in flowTypedModulesLoadingRules.

- Updated dependencies []:
  - @callstack/repack-dev-server@5.0.0-rc.7

## 5.0.0-rc.6

### Minor Changes

- [#855](https://github.com/callstack/repack/pull/855) [`6421e0b`](https://github.com/callstack/repack/commit/6421e0b9b5a91116bad280bae9462f6974f66caa) Thanks [@borisyankov](https://github.com/borisyankov)! - Optimize 'checkIfCacheDataOutdated' to do as few comparisons as possible

### Patch Changes

- [#856](https://github.com/callstack/repack/pull/856) [`9570c83`](https://github.com/callstack/repack/commit/9570c83918348a38f2fd01385755e9da0ef6fc08) Thanks [@jbroma](https://github.com/jbroma)! - Fix loading of 2nd level Module Federation 2 remotes

- [#842](https://github.com/callstack/repack/pull/842) [`d8eb77e`](https://github.com/callstack/repack/commit/d8eb77e1ebade637d96e44a8b8f3bf0eaf00846b) Thanks [@jbroma](https://github.com/jbroma)! - Fix missing apply on ProvidePlugin for React Refresh Utils in DevelopmentPlugin

- [#843](https://github.com/callstack/repack/pull/843) [`3029ab6`](https://github.com/callstack/repack/commit/3029ab6d48312a51c19a257c11fcd02016a44af3) Thanks [@jbroma](https://github.com/jbroma)! - Fix missing config for swc loader rules

- Updated dependencies []:
  - @callstack/repack-dev-server@5.0.0-rc.6

## 5.0.0-rc.5

### Patch Changes

- [#835](https://github.com/callstack/repack/pull/835) [`ae89e38`](https://github.com/callstack/repack/commit/ae89e38fd13fab7c133f8e1c68bc7f02f5cdf04d) Thanks [@mrsasuu](https://github.com/mrsasuu)! - Fix ScriptManager import path in MF runtime plugins (CorePlugin & ResolverPlugin)

- Updated dependencies []:
  - @callstack/repack-dev-server@5.0.0-rc.5

## 5.0.0-rc.4

### Major Changes

- [#825](https://github.com/callstack/repack/pull/825) [`18f2eef`](https://github.com/callstack/repack/commit/18f2eef7dbb2a79e709c1810c69a34b0a0fe9004) Thanks [@jbroma](https://github.com/jbroma)! - Removed `--reverse-port` CLI option and replaced it with `--no-reverse-port` CLI option.

### Minor Changes

- [#828](https://github.com/callstack/repack/pull/828) [`b1a010a`](https://github.com/callstack/repack/commit/b1a010a7dd8af5612759e134249ae0587e42aef7) Thanks [@jbroma](https://github.com/jbroma)! - Run adb reverse for all available devices by default

- [#828](https://github.com/callstack/repack/pull/828) [`b1a010a`](https://github.com/callstack/repack/commit/b1a010a7dd8af5612759e134249ae0587e42aef7) Thanks [@jbroma](https://github.com/jbroma)! - Wait for android device before running adb reverse when starting dev-server

- [#824](https://github.com/callstack/repack/pull/824) [`8cf7cc3`](https://github.com/callstack/repack/commit/8cf7cc3622ad85cf093005c5c55c8dd63940a57b) Thanks [@jbroma](https://github.com/jbroma)! - Added `adb reverse` interaction & `adb reverse` command is now run by default when bundling for Android

### Patch Changes

- [#829](https://github.com/callstack/repack/pull/829) [`617c501`](https://github.com/callstack/repack/commit/617c5018e1f2b0520f6f978b2c1440239196f662) Thanks [@jbroma](https://github.com/jbroma)! - Fix early JS errors not being displayed in LogBox

- Updated dependencies []:
  - @callstack/repack-dev-server@5.0.0-rc.4

## 5.0.0-rc.3

### Minor Changes

- [#817](https://github.com/callstack/repack/pull/817) [`c97da24`](https://github.com/callstack/repack/commit/c97da241876ec8dbe6c2d206590d697f429e86b4) Thanks [@jbroma](https://github.com/jbroma)! - Add Repack Reanimated Plugin which integrates react-native-reanimated into the project

- [#810](https://github.com/callstack/repack/pull/810) [`46330d7`](https://github.com/callstack/repack/commit/46330d70db99a372046baf8ee4565e4a21e5b4f3) Thanks [@jbroma](https://github.com/jbroma)! - Include `@rspack/plugin-react-refresh` with Re.Pack instead of requiring user to install it

- [#816](https://github.com/callstack/repack/pull/816) [`6ed9a6f`](https://github.com/callstack/repack/commit/6ed9a6fcb40ba946b39dfe1d302ad2ebf9dffacf) Thanks [@jbroma](https://github.com/jbroma)! - Support platform specific assets

- [#803](https://github.com/callstack/repack/pull/803) [`daffbf7`](https://github.com/callstack/repack/commit/daffbf72088ba666d956e35a265546a89ee84f42) Thanks [@jbroma](https://github.com/jbroma)! - Refactor FederationRuntimePlugin into two separate plugins for more granular control over the MF2 runtime behaviour (CorePlugin & ResolverPlugin)

### Patch Changes

- [#821](https://github.com/callstack/repack/pull/821) [`287991e`](https://github.com/callstack/repack/commit/287991eb002725f78c23aafe89131fcadb8edaf1) Thanks [@jbroma](https://github.com/jbroma)! - Ignore irrelevant MF2 runtime warning about request of a dependency being an expression

- [#814](https://github.com/callstack/repack/pull/814) [`592fbe3`](https://github.com/callstack/repack/commit/592fbe3fe8eeeeb856d260c3106f5f6cd6eeaef8) Thanks [@jbroma](https://github.com/jbroma)! - Fix how size of a scaled assets is obtained (aligned with metro)

- [#808](https://github.com/callstack/repack/pull/808) [`f600e07`](https://github.com/callstack/repack/commit/f600e075645c5f310abe67591cbdf11221944cba) Thanks [@jbroma](https://github.com/jbroma)! - Fix type JSX runtime transform when transpiling node modules

- [#819](https://github.com/callstack/repack/pull/819) [`9890400`](https://github.com/callstack/repack/commit/9890400fe5ac750698ceb3eaf72e0b3a86ae4a73) Thanks [@jbroma](https://github.com/jbroma)! - Fix missing sourcemap generation for codegen related files and configure separate rules for ts & tsx files

- [#802](https://github.com/callstack/repack/pull/802) [`502527e`](https://github.com/callstack/repack/commit/502527e8c44990fb544ff500034dbdbd687c5d60) Thanks [@thymikee](https://github.com/thymikee)! - Export commands from package entrypoint

- [#820](https://github.com/callstack/repack/pull/820) [`39f80b3`](https://github.com/callstack/repack/commit/39f80b3661a348b9d778f76af2848ed615582d23) Thanks [@jbroma](https://github.com/jbroma)! - Ignore setUpTests warning from Reanimated by default

- Updated dependencies []:
  - @callstack/repack-dev-server@5.0.0-rc.3

## 5.0.0-rc.2

### Patch Changes

- [#799](https://github.com/callstack/repack/pull/799) [`f801083`](https://github.com/callstack/repack/commit/f801083f7ba616e77fa77c1c6321875de6886388) Thanks [@jbroma](https://github.com/jbroma)! - Expose MF2 config property to external tooling

- Updated dependencies []:
  - @callstack/repack-dev-server@5.0.0-rc.2

## 5.0.0-rc.1

### Major Changes

- [#780](https://github.com/callstack/repack/pull/780) [`e937211`](https://github.com/callstack/repack/commit/e93721194e3d8eae64fa5da6f5e296378ad407e9) Thanks [@jbroma](https://github.com/jbroma)! - Removed `--silent` CLI flag for start command.

  For silencing output, you can use shell redirection instead:

  - Unix/macOS: `npx react-native start > /dev/null 2>&1`
  - Windows: `npx react-native start > nul 2>&1`

- [#786](https://github.com/callstack/repack/pull/786) [`cf42d14`](https://github.com/callstack/repack/commit/cf42d149ca1ccb8caae9085ab7710ff7b603a9d0) Thanks [@jbroma](https://github.com/jbroma)! - Enable new debugger (React Native DevTools) by default, remove support for legacy remote debugging

### Minor Changes

- [#784](https://github.com/callstack/repack/pull/784) [`f8af03c`](https://github.com/callstack/repack/commit/f8af03cd231c3d95a92099719d827e368f707b5c) Thanks [@zmzlois](https://github.com/zmzlois)! - add `react-native-linear-gradient` to flow type module loading rule support

- [#778](https://github.com/callstack/repack/pull/778) [`2344162`](https://github.com/callstack/repack/commit/23441620335e91382dda01d0cc06278efede45cf) Thanks [@jbroma](https://github.com/jbroma)! - Add `--config` option to commands, deprecate `--webpackConfig` option

### Patch Changes

- [#776](https://github.com/callstack/repack/pull/776) [`31d0e32`](https://github.com/callstack/repack/commit/31d0e32e6a4b9aa9d9d0fbd3f1ddd18e95a16757) Thanks [@jbroma](https://github.com/jbroma)! - Fix peer dependency config for @rspack/core in repack package

- [#775](https://github.com/callstack/repack/pull/775) [`76738de`](https://github.com/callstack/repack/commit/76738de12fdf29f5af78aaa23f03337c33c7926a) Thanks [@jbroma](https://github.com/jbroma)! - Fix customization of MF1 federated entry filename

- [#787](https://github.com/callstack/repack/pull/787) [`acdd0c8`](https://github.com/callstack/repack/commit/acdd0c801ab611a25164fce5302e20e61ae25292) Thanks [@jbroma](https://github.com/jbroma)! - Fix sourceURL of bundles so source maps can be matched in dev tools

- [#779](https://github.com/callstack/repack/pull/779) [`679bcd8`](https://github.com/callstack/repack/commit/679bcd8917aca587c36d550101e9dd9578e1e172) Thanks [@jbroma](https://github.com/jbroma)! - More intuitive behaviour of `--verbose` flag in start command

- Updated dependencies []:
  - @callstack/repack-dev-server@5.0.0-rc.1

## 5.0.0-rc.0

### Minor Changes

- [#674](https://github.com/callstack/repack/pull/674) [`9f4ad85`](https://github.com/callstack/repack/commit/9f4ad85648f02a127113e7c56d726a923cc0dc12) Thanks [@jbroma](https://github.com/jbroma)! - Add support for Module Federation V2

- [#765](https://github.com/callstack/repack/pull/765) [`efff0c2`](https://github.com/callstack/repack/commit/efff0c29801db04eddbbc8f3776cb3e56457f585) Thanks [@jbroma](https://github.com/jbroma)! - Add default rules for transpiling popular flow typed packages

- [#702](https://github.com/callstack/repack/pull/702) [`495203d`](https://github.com/callstack/repack/commit/495203dc3a1d219aea623afe99912957d8f0e0a1) Thanks [@jbroma](https://github.com/jbroma)! - Enable dev-server to serve source assets alongside build artifacts

- [#763](https://github.com/callstack/repack/pull/763) [`e433584`](https://github.com/callstack/repack/commit/e4335840a4b1ed59affc89375988ba6a9db57891) Thanks [@thiagobrez](https://github.com/thiagobrez)! - Add getModulePaths utility to generate include and exclude paths for modules in the bundler config

- [#757](https://github.com/callstack/repack/pull/757) [`8a90731`](https://github.com/callstack/repack/commit/8a9073146c6541ed374541b9bcf9ebe3c4f70e9a) Thanks [@artus9033](https://github.com/artus9033)! - Display list of available interactions on dev server startup & add support for 'j' to debug

- [#753](https://github.com/callstack/repack/pull/753) [`176324a`](https://github.com/callstack/repack/commit/176324a8d09d34dd1fbc68e0e227640834138f5a) Thanks [@artus9033](https://github.com/artus9033)! - Add support for React Native 0.76

- [#750](https://github.com/callstack/repack/pull/750) [`c4a3235`](https://github.com/callstack/repack/commit/c4a32354feaccdfda8570b6a065dc6f7a6b9f6d0) Thanks [@jbroma](https://github.com/jbroma)! - Normalize filepath & ensure path exists when writing stats to a file

- [#734](https://github.com/callstack/repack/pull/734) [`b455503`](https://github.com/callstack/repack/commit/b4555030b7827e14084db282accd138945d532c5) Thanks [@hexboy](https://github.com/hexboy)! - Add a mechanism for retrying downloads of scripts through `retry` and `retryDelay` properties

### Patch Changes

- [#711](https://github.com/callstack/repack/pull/711) [`7af6d5b`](https://github.com/callstack/repack/commit/7af6d5bad8288ea58dd246243fe96439709cbe97) Thanks [@jbroma](https://github.com/jbroma)! - fix: always use URL from Script config as `sourceUrl` when evaluating bundles on Android

- [#766](https://github.com/callstack/repack/pull/766) [`206d76f`](https://github.com/callstack/repack/commit/206d76f30a4858680839fa53b9f8a3a2070ed9f8) Thanks [@jbroma](https://github.com/jbroma)! - Fix handling of cjs,mjs,cts,mts files when transpiling node modules with swc

- [#755](https://github.com/callstack/repack/pull/755) [`90faeeb`](https://github.com/callstack/repack/commit/90faeeb7d6be9ddf5aa74c9552df01ec58d5372c) Thanks [@jbroma](https://github.com/jbroma)! - Disable package imports by default

- [#756](https://github.com/callstack/repack/pull/756) [`f119ab3`](https://github.com/callstack/repack/commit/f119ab3eb94eff9d2cc1aec8fcf9f835c3025abc) Thanks [@hosseinmd](https://github.com/hosseinmd)! - Prevent to loadScript which is already is loading
  issue: https://github.com/callstack/repack/issues/749

- [#771](https://github.com/callstack/repack/pull/771) [`df1d587`](https://github.com/callstack/repack/commit/df1d587115abb61a7168d02d04e451ee3f8066de) Thanks [@hosseinmd](https://github.com/hosseinmd)! - script should be cached after successfully loaded

- Updated dependencies []:
  - @callstack/repack-dev-server@5.0.0-rc.1

## 5.0.0-alpha.0

### Major Changes

- [#720](https://github.com/callstack/repack/pull/720) [`a7b557e`](https://github.com/callstack/repack/commit/a7b557ed162166d9bc152b06d8be3169a0a2a176) Thanks [@jbroma](https://github.com/jbroma)! - Support for Rspack & Webpack simultaneously

### Patch Changes

- Updated dependencies []:
  - @callstack/repack-dev-server@5.0.0-alpha.0

## 4.3.3

### Patch Changes

- [#745](https://github.com/callstack/repack/pull/745) [`dbbaf72`](https://github.com/callstack/repack/commit/dbbaf72ac08e4575237e824a3cdfd7277a4406f8) Thanks [@ra1nj](https://github.com/ra1nj)! - Fixed error message on iOS when the HTTP status is not 2xx.

- [#739](https://github.com/callstack/repack/pull/739) [`300524b`](https://github.com/callstack/repack/commit/300524b33db1f08f257664826d7e160ba76b9f19) Thanks [@ra1nj](https://github.com/ra1nj)! - Fix url query being encoded twice on iOS

- Updated dependencies []:
  - @callstack/repack-dev-server@4.3.3

## 4.3.2

### Patch Changes

- [#723](https://github.com/callstack/repack/pull/723) [`d3c96b8`](https://github.com/callstack/repack/commit/d3c96b8f55237b714ac0eed03d94d0d1b6cff565) Thanks [@jbroma](https://github.com/jbroma)! - Fix reading `webpack.config.mjs` on Windows

- Updated dependencies []:
  - @callstack/repack-dev-server@4.3.2

## 4.3.1

### Patch Changes

- [#714](https://github.com/callstack/repack/pull/714) [`bad76d7`](https://github.com/callstack/repack/commit/bad76d7e0386130d7cbd4da6fed7ca39bcc2bfd4) Thanks [@jbroma](https://github.com/jbroma)! - Fix missing `--reset-cache` flag for both start and bundle CLI commands

- Updated dependencies []:
  - @callstack/repack-dev-server@4.3.1

## 4.3.0

### Minor Changes

- [#687](https://github.com/callstack/repack/pull/687) [`8d823a7`](https://github.com/callstack/repack/commit/8d823a7097ef2642ba0a91e0cd3eb27c5002ae6b) Thanks [@jbroma](https://github.com/jbroma)! - Added `--watch` flag to bundle command

### Patch Changes

- [#710](https://github.com/callstack/repack/pull/710) [`a467bb5`](https://github.com/callstack/repack/commit/a467bb5e008f3b7725dc20970f2341a45a11e5c3) Thanks [@jbroma](https://github.com/jbroma)! - Use compile-time check to determine React-Native version in `WebpackHMRClient`

- [#697](https://github.com/callstack/repack/pull/697) [`14550ab`](https://github.com/callstack/repack/commit/14550abbbc8a5cc8b69ec571f9279197ac09a32a) Thanks [@jbroma](https://github.com/jbroma)! - Align CLI options for `start` and `bundle` commands with `@react-native/community-cli-plugin`.

- [#703](https://github.com/callstack/repack/pull/703) [`4de5305`](https://github.com/callstack/repack/commit/4de530504035c23a1d0004a26dc1d5368f9c82fb) Thanks [@hexboy](https://github.com/hexboy)! - Fix `LoadingView` import in `WebpackHMRClient` for React Native >=0.75

- Updated dependencies []:
  - @callstack/repack-dev-server@4.3.0

## 4.2.0

### Minor Changes

- [#680](https://github.com/callstack/repack/pull/680) [`b936d63`](https://github.com/callstack/repack/commit/b936d6314d302ec8a5863bb65f11b88965567a2c) Thanks [@jbroma](https://github.com/jbroma)! - Fix bundle caching after invalidating scripts

- [#683](https://github.com/callstack/repack/pull/683) [`8b07027`](https://github.com/callstack/repack/commit/8b070273f4e047d984e60f929d0022ed4d96592c) Thanks [@jbroma](https://github.com/jbroma)! - Fix bundle naming collisions when using device filesystem cache

- [#641](https://github.com/callstack/repack/pull/641) [`c9eaef8`](https://github.com/callstack/repack/commit/c9eaef8e9e126572ad98d7f7daa126dda4acc160) Thanks [@jbroma](https://github.com/jbroma)! - Fix typing for methods exposed in native module

- [#651](https://github.com/callstack/repack/pull/651) [`a385b2b`](https://github.com/callstack/repack/commit/a385b2b088f59f96ce48cbf54256d21632ef2481) Thanks [@adammruk](https://github.com/adammruk)! - Added 'assetPath' field to remote assets config, enabling granular control over the generated URL and server location to the asset

### Patch Changes

- [#679](https://github.com/callstack/repack/pull/679) [`d8924c6`](https://github.com/callstack/repack/commit/d8924c62303928b54cffc290f84423b23a468976) Thanks [@jbroma](https://github.com/jbroma)! - Fix infinite loop when traversing the chunk graph in OutputPlugin

- [#647](https://github.com/callstack/repack/pull/647) [`e51b7a6`](https://github.com/callstack/repack/commit/e51b7a6ec2c90d7d75c1b2a11a85b97413b6b000) Thanks [@jhso-dev](https://github.com/jhso-dev)! - Correctly parse platform from file URL

- [#656](https://github.com/callstack/repack/pull/656) [`1e27ae5`](https://github.com/callstack/repack/commit/1e27ae5c6def67d5e2862717af60881f792f72a3) Thanks [@barttom](https://github.com/barttom)! - Improved descriptions of start and bundle command options

- [#678](https://github.com/callstack/repack/pull/678) [`46f1eb4`](https://github.com/callstack/repack/commit/46f1eb42949d70188ec3711f35282f097e4729f2) Thanks [@jbroma](https://github.com/jbroma)! - Refactor OutputPlugin's chunk categorization algorithm

- [#646](https://github.com/callstack/repack/pull/646) [`9c119db`](https://github.com/callstack/repack/commit/9c119db8a6bd340b3655e4be80d52492d62f9c56) Thanks [@jbroma](https://github.com/jbroma)! - Prevent infinite recursion when tracking down initial chunks in Output Plugin

- Updated dependencies []:
  - @callstack/repack-dev-server@4.2.0

## 4.1.1

### Patch Changes

- [#639](https://github.com/callstack/repack/pull/639) [`13db9ed`](https://github.com/callstack/repack/commit/13db9edb2786454d34303596d67cd6e412a42d43) Thanks [@jbroma](https://github.com/jbroma)! - Fix android native module configuration

- Updated dependencies []:
  - @callstack/repack-dev-server@4.1.1

## 4.1.0

### Minor Changes

- [#633](https://github.com/callstack/repack/pull/633) [`38a9ff0`](https://github.com/callstack/repack/commit/38a9ff013d9fb79a75e64a557be2cee75e964cc1) Thanks [@jbroma](https://github.com/jbroma)! - Support for bridgeless new architecture

### Patch Changes

- [#628](https://github.com/callstack/repack/pull/628) [`9485bd6`](https://github.com/callstack/repack/commit/9485bd6c6c377498159d0523f39eb98eee5e638a) Thanks [@jbroma](https://github.com/jbroma)! - Remove loader-utils in favor of webpack loader builtins

- [#630](https://github.com/callstack/repack/pull/630) [`dc55cef`](https://github.com/callstack/repack/commit/dc55cef0d07749b64aded2854ed998964a0b2341) Thanks [@jbroma](https://github.com/jbroma)! - Use the current Node when composing Hermes sourcemaps

- Updated dependencies []:
  - @callstack/repack-dev-server@4.1.0

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
    { priority: 1 }
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
    { priority: 1 }
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
