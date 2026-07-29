# Internal plugins

## OutputPlugin

## LoggerPlugin

## NativeEntryPlugin

Plugin that sets up the React Native entry point for each compilation entry. It adds React Native polyfills, `InitializeCore`, `InitializeScriptManager`, and `IncludeModules` as entry modules processed through the standard loader pipeline. A companion runtime module (`PolyfillsRuntimeModule`) ensures polyfills execute before Module Federation's startup wrapper, regardless of the federation version or bundler used.

## DevelopmentPlugin

## RepackTargetPlugin

## BabelPlugin

Plugin that adds `babel-loader` fallback to resolveLoader configuration. This ensures babel-loader can be resolved regardless of the package manager used, as some package managers (like `pnpm`) require loaders to be direct dependencies rather than allowing them to be resolved through nested dependencies.

## CodegenPlugin

Plugin that handles React Native Codegen transforms required by the new architecture. It adds a `babel-loader` rule for processing Native components and modules, similar to how it's done in `@react-native/babel-preset`.
