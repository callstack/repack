import type { Compiler, SourceMapDevToolPluginOptions } from '@rspack/core';

// the Module Federation runtime is a `data:` URI module, whose percent-encoded
// resource path Re.Pack's dev template splits into a bogus `webpack://` source
const MALFORMED_VIRTUAL_MODULE_PREFIX = 'webpack://%3D%3D%22undefined%22%7D';

type ModuleFilenameTemplate =
  SourceMapDevToolPluginOptions['moduleFilenameTemplate'];
type ModuleFilenameTemplateFn = Exclude<
  ModuleFilenameTemplate,
  string | undefined
>;

function normalizeModuleFilenameTemplate(
  template: ModuleFilenameTemplate
): ModuleFilenameTemplate {
  if (typeof template !== 'function') return template;

  return ((info) => {
    const source = template(info);
    if (!source.startsWith(MALFORMED_VIRTUAL_MODULE_PREFIX)) return source;

    return `webpack://module-federation/virtual-runtime-${info.hash}.js`;
  }) satisfies ModuleFilenameTemplateFn;
}

type RepackPlugin = {
  apply(compiler: Compiler): void;
};

export function applyRepackSourceMapFix(
  compiler: Compiler,
  repackPlugin: RepackPlugin
): void {
  if (
    compiler.options.mode !== 'development' ||
    !compiler.options.devServer ||
    !compiler.options.devtool
  ) {
    repackPlugin.apply(compiler);
    return;
  }

  const SourceMapDevToolPlugin = compiler.webpack.SourceMapDevToolPlugin;
  compiler.webpack.SourceMapDevToolPlugin = class extends (
    SourceMapDevToolPlugin
  ) {
    constructor(options: SourceMapDevToolPluginOptions) {
      super({
        ...options,
        moduleFilenameTemplate: normalizeModuleFilenameTemplate(
          options.moduleFilenameTemplate
        ),
      });
    }
  };

  try {
    repackPlugin.apply(compiler);
  } finally {
    compiler.webpack.SourceMapDevToolPlugin = SourceMapDevToolPlugin;
  }
}
