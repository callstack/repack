import { RuntimeGlobals, RuntimeModule, Template } from '@rspack/core';

interface LoadScriptRuntimeModuleConfig {
  chunkId: string | number | undefined;
  hmrEnabled: boolean;
}

export class LoadScriptRuntimeModule extends RuntimeModule {
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
}
