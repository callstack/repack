import rspack, { RspackPluginInstance } from '@rspack/core';
// import ReactRefreshPlugin from '@rspack/plugin-react-refresh';
import type { DevServerOptions } from '../../types';

// type ExtractEntryStaticNormalized<E> = E extends () => Promise<infer U>
//   ? U
//   : E extends { [key: string]: any }
//   ? E
//   : never;

// type EntryStaticNormalized =
//   ExtractEntryStaticNormalized<webpack.EntryNormalized>;

// type ModuleDependency = webpack.dependencies.ModuleDependency;
/**
 * {@link DevelopmentPlugin} configuration options.
 */
export interface DevelopmentPluginConfig {
  platform: string;
  devServer?: DevServerOptions;
}

/**
 * Class for running development server that handles serving the built bundle, all assets as well as
 * providing Hot Module Replacement functionality.
 *
 * @category Webpack Plugin
 */
export class DevelopmentPlugin implements RspackPluginInstance {
  /**
   * Constructs new `DevelopmentPlugin`.
   *
   * @param config Plugin configuration options.
   */
  constructor(private config?: DevelopmentPluginConfig) {}

  /**
   * Apply the plugin.
   *
   * @param compiler Webpack compiler instance.
   */
  apply(compiler: rspack.Compiler) {
    if (!this.config?.devServer) {
      return;
    }

    compiler.options.builtins.define = {
      ...compiler.options.builtins.define,
      __PUBLIC_PORT__: JSON.stringify(this.config.devServer.port),
      __PLATFORM__: JSON.stringify(this.config.platform),
    };
  }
}
