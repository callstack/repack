import type { Compiler, SourceMapDevToolPluginOptions } from '@rspack/core';

const MALFORMED_VIRTUAL_MODULE_PREFIX = 'webpack://=="undefined"}';

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
