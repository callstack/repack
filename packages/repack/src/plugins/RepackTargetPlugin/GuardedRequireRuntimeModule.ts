import type {
  Compiler,
  RuntimeModule as RuntimeModuleType,
} from '@rspack/core';

interface GuardedRequireRuntimeModuleConfig {
  globalObject: string;
}

// runtime module class is generated dynamically based on the compiler instance
// this way it's compatible with both webpack and rspack
export const makeGuardedRequireRuntimeModule = (
  compiler: Compiler,
  moduleConfig: GuardedRequireRuntimeModuleConfig
): RuntimeModuleType => {
  const Template = compiler.webpack.Template;
  const RuntimeModule = compiler.webpack.RuntimeModule;

  const GuardedRequireRuntimeModule = class extends RuntimeModule {
    constructor(private config: GuardedRequireRuntimeModuleConfig) {
      super('repack/guarded require', RuntimeModule.STAGE_NORMAL);
    }

    generate() {
      return Template.asString([
        Template.getFunctionContent(
          require('./implementation/guardedRequire.js')
        ).replaceAll('$globalObject$', this.config.globalObject),
      ]);
    }
  };

  return new GuardedRequireRuntimeModule(moduleConfig);
};
