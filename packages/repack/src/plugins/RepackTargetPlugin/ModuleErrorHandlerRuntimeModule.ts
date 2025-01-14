import { RuntimeGlobals, RuntimeModule, Template } from '@rspack/core';

interface ModuleErrorHandlerRuntimeModuleConfig {
  globalObject: string;
}

export class ModuleErrorHandlerRuntimeModule extends RuntimeModule {
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
}
