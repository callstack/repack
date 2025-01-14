import type {
  Compiler,
  RuntimeModule as RuntimeModuleType,
} from '@rspack/core';

interface ModuleErrorHandlerRuntimeModuleConfig {
  globalObject: string;
}

export const makeModuleErrorHandlerRuntimeModule = (
  compiler: Compiler,
  moduleConfig: ModuleErrorHandlerRuntimeModuleConfig
): RuntimeModuleType => {
  const Template = compiler.webpack.Template;
  const RuntimeGlobals = compiler.webpack.RuntimeGlobals;
  const RuntimeModule = compiler.webpack.RuntimeModule;

  const ModuleErrorHandlerRuntimeModule = class extends RuntimeModule {
    constructor(private config: ModuleErrorHandlerRuntimeModuleConfig) {
      super('repack/module error handler', RuntimeModule.STAGE_BASIC);
    }

    generate() {
      return Template.asString([
        Template.getFunctionContent(
          require('./implementation/moduleErrorHandler.js')
        )
          .replaceAll('$globalObject$', this.config.globalObject)
          .replaceAll(
            '$interceptModuleExecution$',
            RuntimeGlobals.interceptModuleExecution
          ),
      ]);
    }
  };

  return new ModuleErrorHandlerRuntimeModule(moduleConfig);
};
