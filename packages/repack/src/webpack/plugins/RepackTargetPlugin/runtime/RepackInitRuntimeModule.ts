import { Template } from '@rspack/core';

interface RepackInitRuntimeModuleConfig {
  globalObject: string;
  hmrEnabled?: boolean;
}

export function generateRepackInitRuntimeModule(
  config: RepackInitRuntimeModuleConfig
) {
  return Template.asString([
    '// Repack runtime initialization logic',
    Template.getFunctionContent(require('./implementation/init'))
      .replaceAll('$hmrEnabled$', `${config.hmrEnabled ?? false}`)
      .replaceAll('$globalObject$', config.globalObject),
  ]);
}
