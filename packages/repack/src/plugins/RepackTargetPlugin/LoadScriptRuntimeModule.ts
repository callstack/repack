import type {
  Compiler,
  RuntimeModule as RuntimeModuleType,
} from '@rspack/core';

interface LoadScriptRuntimeModuleConfig {
  chunkId: string | number | undefined;
  hmrEnabled: boolean;
}

// runtime module class is generated dynamically based on the compiler instance
// this way it's compatible with both webpack and rspack
export const makeLoadScriptRuntimeModule = (
  compiler: Compiler,
  moduleConfig: LoadScriptRuntimeModuleConfig
): RuntimeModuleType => {
  const Template = compiler.webpack.Template;
  const RuntimeGlobals = compiler.webpack.RuntimeGlobals;
  const RuntimeModule = compiler.webpack.RuntimeModule;

  const LoadScriptRuntimeModule = class extends RuntimeModule {
    constructor(private config: LoadScriptRuntimeModuleConfig) {
      super('repack/load script', RuntimeModule.STAGE_BASIC);
    }

    generate() {
      return Template.asString([
        Template.getFunctionContent(require('./implementation/loadScript.js'))
          .replaceAll('$caller$', `'${this.config.chunkId?.toString()}'`)
          .replaceAll('$hmrEnabled$', `${this.config.hmrEnabled}`)
          .replaceAll('$loadScript$', RuntimeGlobals.loadScript),
      ]);
    }
  };

  return new LoadScriptRuntimeModule(moduleConfig);
};
