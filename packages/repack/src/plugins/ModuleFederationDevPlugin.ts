import type { Compiler, RspackPluginInstance } from '@rspack/core';

/**
 * Internal plugin to help with development of Module Federation.
 */
export class ModuleFederationDevPlugin implements RspackPluginInstance {
  apply(compiler: Compiler) {
    try {
      require.resolve('@module-federation/enhanced');
    } catch {
      return;
    }

    const instance = compiler.options.plugins.find((plugin) => {
      if (typeof plugin !== 'object') return false;
      return (
        plugin?.name?.includes('ModuleFederationPlugin') ||
        plugin?.constructor?.name.includes('ModuleFederationPlugin')
      );
    }) as RspackPluginInstance | undefined;

    if (!instance) return;

    // MF2 produces warning about not supporting async await
    // we can silence this warning since it works just fine
    compiler.options.ignoreWarnings = compiler.options.ignoreWarnings ?? [];
    compiler.options.ignoreWarnings.push(
      (warning) => warning.name === 'EnvironmentNotSupportAsyncWarning'
    );
  }
}
