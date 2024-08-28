import rspack from '@rspack/core';

interface RepackInitRuntimeModuleConfig {
  globalObject: string;
  hmrEnabled?: boolean;
}

export function generateRepackInitRuntimeModule(
  config: RepackInitRuntimeModuleConfig
) {
  return rspack.Template.asString([
    '// Repack runtime initialization logic',
    rspack.Template.getFunctionContent(require('./implementation/init'))
      .replaceAll('$hmrEnabled$', `${config.hmrEnabled ?? false}`)
      .replaceAll('$globalObject$', config.globalObject),
  ]);
}
