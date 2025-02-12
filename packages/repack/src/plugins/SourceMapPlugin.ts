import type { Compiler, RspackPluginInstance } from '@rspack/core';

export class SourceMapPlugin implements RspackPluginInstance {
  apply(compiler: Compiler) {
    if (!compiler.options.devtool) {
      return;
    }

    const platform = compiler.name as string;
    const format = compiler.options.devtool;
    const devtoolModuleFilenameTemplate =
      compiler.options.output.devtoolModuleFilenameTemplate;
    const devtoolFallbackModuleFilenameTemplate =
      compiler.options.output.devtoolFallbackModuleFilenameTemplate;

    if (
      format === 'eval' ||
      format === 'eval-source-map' ||
      format === 'eval-cheap-source-map' ||
      format === 'eval-cheap-module-source-map' ||
      format === 'eval-nosources-source-map' ||
      format === 'eval-nosources-cheap-source-map' ||
      format === 'eval-nosources-cheap-module-source-map'
    ) {
      throw new Error(
        '[RepackSourceMapPlugin] Eval source maps are not supported'
      );
    }

    if (
      format === 'inline-cheap-source-map' ||
      format === 'inline-cheap-module-source-map' ||
      format === 'inline-source-map' ||
      format === 'inline-nosources-cheap-source-map' ||
      format === 'inline-nosources-cheap-module-source-map' ||
      format === 'inline-nosources-source-map'
    ) {
      throw new Error(
        '[RepackSourceMapPlugin] Inline source maps are not supported'
      );
    }

    const hidden = format.includes('hidden');
    const cheap = format.includes('cheap');
    const moduleMaps = format.includes('module');
    const noSources = format.includes('nosources');
    const debugIds = format.includes('debugids');

    // TODO Fix sourcemap directory structure
    // Right now its very messy and not every node module is inside of the node module
    // like React Devtools backend etc or some symilinked module appear with relative path
    // We should normalize this through a custom handler and provide an output similar to Metro
    new compiler.webpack.SourceMapDevToolPlugin({
      filename: '[file].map',
      moduleFilenameTemplate: devtoolModuleFilenameTemplate,
      fallbackModuleFilenameTemplate: devtoolFallbackModuleFilenameTemplate,
      append: hidden
        ? false
        : `//# sourceMappingURL=[url]?platform=${platform}`,
      module: moduleMaps ? true : !cheap,
      columns: !cheap,
      noSources,
      // TODO verify this
      namespace:
        compiler.options.output.devtoolNamespace ??
        compiler.options.output.uniqueName,
      debugIds,
    }).apply(compiler);
  }
}
