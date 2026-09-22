# Internal plugins

## OutputPlugin

## LoggerPlugin

## NativeEntryPlugin

Plugin that sets up the React Native entry point for each compilation entry. It adds React Native polyfills, `InitializeCore`, `InitializeScriptManager`, and `IncludeModules` as entry modules processed through the standard loader pipeline. A companion runtime module (`PolyfillsRuntimeModule`) ensures polyfills execute before Module Federation's startup wrapper, regardless of the federation version or bundler used.

Polyfills are read from React Native's `rn-get-polyfills.js` when present (React Native 0.86 and earlier). React Native 0.87 removed that file together with its dependency on `@react-native/js-polyfills`, so the plugin resolves `@react-native/js-polyfills` from the project instead, falling back through `@react-native/metro-config` (which still depends on it and is a devDependency of the default template). If neither can be found, the build fails with an error asking you to add a version-matched `@react-native/js-polyfills` or `@react-native/metro-config` to your project.

On the React Native 0.87 layout the plugin also prepends two resolve aliases: `react-native/Libraries/Image/AssetRegistry` maps to the relocated `src/asset-registry.js`, and `react-native/src/private` maps to the on-disk directory so first-party deep imports keep resolving when package exports are enabled. Neither alias is added on 0.86 and earlier.

## DevelopmentPlugin

## RepackTargetPlugin

## BabelPlugin

Plugin that adds `babel-loader` fallback to resolveLoader configuration. This ensures babel-loader can be resolved regardless of the package manager used, as some package managers (like `pnpm`) require loaders to be direct dependencies rather than allowing them to be resolved through nested dependencies.

## CodegenPlugin

Plugin that handles React Native Codegen transforms required by the new architecture. It adds a `babel-loader` rule for processing Native components and modules, similar to how it's done in `@react-native/babel-preset`.
