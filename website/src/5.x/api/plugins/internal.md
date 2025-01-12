# Internal plugins

## OutputPlugin

## LoggerPlugin

## NativeEntryPlugin

## DevelopmentPlugin

## RepackTargetPlugin

## BabelPlugin

Plugin that adds `babel-loader` fallback to resolveLoader configuration. This ensures babel-loader can be resolved regardless of the package manager used, as some package managers (like `pnpm`) require loaders to be direct dependencies rather than allowing them to be resolved through nested dependencies.
