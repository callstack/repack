import path from 'node:path';
import type {
  Compiler as RspackCompiler,
  SourceMapDevToolPluginOptions,
} from '@rspack/core';
import type { Compiler as WebpackCompiler } from 'webpack';
import { ConfigurationError } from '../helpers/index.js';

type ModuleFilenameTemplate =
  SourceMapDevToolPluginOptions['moduleFilenameTemplate'];
type ModuleFilenameTemplateFn = Exclude<
  ModuleFilenameTemplate,
  string | undefined
>;
type ModuleFilenameTemplateFnCtx = Parameters<ModuleFilenameTemplateFn>[0];

function devToolsmoduleFilenameTemplate(
  namespace: string,
  info: ModuleFilenameTemplateFnCtx
) {
  // inlined modules
  if (!info.identifier) {
    return `${namespace}`;
  }

  const [prefix, ...parts] = info.resourcePath.split('/');

  // prefixed modules like React DevTools Backend
  if (prefix !== '.' && prefix !== '..') {
    const resourcePath = parts.filter((part) => part !== '..').join('/');
    return `webpack://${prefix}/${resourcePath}`;
  }

  const hasValidAbsolutePath = path.isAbsolute(info.absoluteResourcePath);

  // project root
  if (hasValidAbsolutePath && info.resourcePath.startsWith('./')) {
    return `[projectRoot]${info.resourcePath.slice(1)}`;
  }

  // outside of project root
  if (hasValidAbsolutePath && info.resourcePath.startsWith('../')) {
    const parts = info.resourcePath.split('/');
    const upLevel = parts.filter((part) => part === '..').length;
    const restPath = parts.slice(parts.lastIndexOf('..') + 1).join('/');
    const rootRef = `[projectRoot^${upLevel}]`;
    return `${rootRef}${restPath ? '/' + restPath : ''}`;
  }

  return `[unknownOrigin]/${path.basename(info.identifier)}`;
}

function defaultModuleFilenameTemplateHandler(
  _: string,
  info: ModuleFilenameTemplateFnCtx
) {
  if (!info.absoluteResourcePath.startsWith('/')) {
    // handle inlined modules
    if (info.query || info.loaders || info.allLoaders) {
      return `inlined-${info.hash}`;
    }
  }
  // use absolute path for all other modules
  return info.absoluteResourcePath;
}

interface SourceMapPluginConfig {
  platform?: string;
}

export class SourceMapPlugin {
  constructor(private config: SourceMapPluginConfig = {}) {}

  apply(compiler: RspackCompiler): void;
  apply(compiler: WebpackCompiler): void;

  apply(__compiler: unknown) {
    const compiler = __compiler as RspackCompiler;

    // if devtool is explicitly set to false, skip generating source maps
    if (!compiler.options.devtool) {
      return;
    }

    let moduleFilenameTemplateHandler: ModuleFilenameTemplateFn;
    if (compiler.options.devServer) {
      const host = compiler.options.devServer.host;
      const port = compiler.options.devServer.port;
      const namespace = `http://${host}:${port}`;
      moduleFilenameTemplateHandler = (info: ModuleFilenameTemplateFnCtx) =>
        devToolsmoduleFilenameTemplate(namespace, info);
    } else {
      moduleFilenameTemplateHandler = (info: ModuleFilenameTemplateFnCtx) =>
        defaultModuleFilenameTemplateHandler('', info);
    }

    const format = compiler.options.devtool;
    // disable builtin sourcemap generation
    compiler.options.devtool = false;

    const platform = this.config.platform ?? (compiler.options.name as string);

    // explicitly fallback to uniqueName if devtoolNamespace is not set
    const devtoolNamespace =
      compiler.options.output.devtoolNamespace ??
      compiler.options.output.uniqueName;
    // const devtoolModuleFilenameTemplate =
    //   compiler.options.output.devtoolModuleFilenameTemplate;
    const devtoolFallbackModuleFilenameTemplate =
      compiler.options.output.devtoolFallbackModuleFilenameTemplate;

    if (format.startsWith('eval')) {
      throw new ConfigurationError(
        '[RepackSourceMapPlugin] Eval source maps are not supported. ' +
          'Please use a different setting for `config.devtool`.'
      );
    }

    if (format.startsWith('inline')) {
      throw new ConfigurationError(
        '[RepackSourceMapPlugin] Inline source maps are not supported. ' +
          'Please use a different setting for `config.devtool`.'
      );
    }

    const hidden = format.includes('hidden');
    const cheap = format.includes('cheap');
    const moduleMaps = format.includes('module');
    const noSources = format.includes('nosources');

    new compiler.webpack.SourceMapDevToolPlugin({
      test: /\.([cm]?jsx?|bundle)$/,
      filename: '[file].map',
      moduleFilenameTemplate: moduleFilenameTemplateHandler,
      fallbackModuleFilenameTemplate: devtoolFallbackModuleFilenameTemplate,
      append: hidden
        ? false
        : `//# sourceMappingURL=[url]?platform=${platform}`,
      module: moduleMaps ? true : !cheap,
      columns: !cheap,
      noSources,
      namespace: devtoolNamespace,
    }).apply(compiler);
  }
}
