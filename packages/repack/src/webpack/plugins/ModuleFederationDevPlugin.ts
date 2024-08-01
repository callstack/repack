import webpack from 'webpack';
import type { WebpackPlugin } from '../../types';

/**
 * Internal plugin to help with development of Module Federation.
 */
export class ModuleFederationDevPlugin implements WebpackPlugin {
  apply(compiler: webpack.Compiler) {
    const ModuleFederationPluginInstance = compiler.options.plugins.find(
      (plugin) => plugin?.constructor?.name === 'ModuleFederationPlugin'
    );

    if (ModuleFederationPluginInstance !== undefined) {
      // MF2 produces warning about not supporting async await
      // we can silence this warning since it works just fine
      (compiler.options.ignoreWarnings =
        compiler.options.ignoreWarnings ?? []).push(
        (warning) => warning.name === 'EnvironmentNotSupportAsyncWarning'
      );
    }
  }
}
