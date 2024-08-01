import webpack, { WebpackPluginInstance } from 'webpack';
import type { WebpackPlugin } from '../../types';

/**
 * Internal plugin to help with development of Module Federation.
 */
export class ModuleFederationDevPlugin implements WebpackPlugin {
  apply(compiler: webpack.Compiler) {
    try {
      require.resolve('@module-federation/enhanced');
    } catch (e) {
      return;
    }

    const instance = compiler.options.plugins.find((plugin) => {
      if (typeof plugin !== 'object') return false;
      return (
        plugin?.name?.includes('ModuleFederationPlugin') ||
        plugin?.constructor?.name.includes('ModuleFederationPlugin')
      );
    }) as WebpackPluginInstance | undefined;

    if (!instance) return;

    // MF2 produces warning about not supporting async await
    // we can silence this warning since it works just fine
    (compiler.options.ignoreWarnings =
      compiler.options.ignoreWarnings ?? []).push(
      (warning) => warning.name === 'EnvironmentNotSupportAsyncWarning'
    );
  }
}
