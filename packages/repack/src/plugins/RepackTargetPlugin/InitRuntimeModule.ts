import { RuntimeModule, Template } from '@rspack/core';

interface InitRuntimeModuleConfig {
  globalObject: string;
}

export class InitRuntimeModule extends RuntimeModule {
  constructor(private config: InitRuntimeModuleConfig) {
    super('repack/init', RuntimeModule.STAGE_BASIC);
  }

  generate() {
    return Template.asString([
      Template.getFunctionContent(
        require('./implementation/init.js')
      ).replaceAll('$globalObject$', this.config.globalObject),
    ]);
  }
}
