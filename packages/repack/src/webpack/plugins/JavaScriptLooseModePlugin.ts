import webpack from 'webpack';
import { Rule, WebpackPlugin } from '../../types';

/**
 * {@link JavaScriptLooseModePlugin} configuration options.
 */
export interface JavaScriptLooseModePluginConfig {
  /** Convert to loose mode all modules that match the rule. */
  test: Rule | Rule[];
  /** Convert to loose mode only those modules that match the rule. */
  include: Rule | Rule[];
  /** Exclude all modules that mach the rule from being converted to loose mode. */
  exclude: Rule | Rule[];
}

/**
 * Enable JavaScript loose mode, by removing `use strict` directives from the code.
 * This plugin should only be used for compatibility reasons with Metro, where some libraries
 * might not work in JavaScript Strict mode.
 *
 * @category Webpack Plugin
 */
export class JavaScriptLooseModePlugin implements WebpackPlugin {
  /**
   * Constructs new `JavaScriptLooseModePlugin`.
   *
   * @param config Plugin configuration options.
   */
  constructor(private config: JavaScriptLooseModePluginConfig) {}

  /**
   * Apply the plugin.
   *
   * @param compiler Webpack compiler instance.
   */
  apply(compiler: webpack.Compiler) {
    const shouldUseLooseMode = (filename: string) =>
      webpack.ModuleFilenameHelpers.matchObject(this.config, filename);

    compiler.hooks.make.tap(
      'JavaScriptLooseModePlugin',
      (compilation: webpack.Compilation) => {
        compilation.moduleTemplates.javascript.hooks.render.tap(
          'JavaScriptLooseModePlugin',
          (
            moduleSource: webpack.sources.Source,
            { resource }: { resource: string }
          ) => {
            if (!shouldUseLooseMode(resource)) {
              return moduleSource;
            }

            const source = moduleSource.source().toString();
            const match = source.match(/['"]use strict['"]/);
            if (match?.index === undefined) {
              return moduleSource;
            }
            const replacement = new webpack.sources.ReplaceSource(moduleSource);
            replacement.replace(match.index, match.index + match[0].length, '');
            return replacement;
          }
        );
      }
    );
  }
}
