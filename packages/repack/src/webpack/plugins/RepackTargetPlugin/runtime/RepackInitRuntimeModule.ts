import rspack from '@rspack/core';

interface RepackInitRuntimeModuleConfig {
  chunkId: string | number | undefined;
  globalObject: string;
  chunkLoadingGlobal: string;
  hmrEnabled?: boolean;
}

export function generateRepackInitRuntimeModule(
  config: RepackInitRuntimeModuleConfig
) {
  return rspack.Template.asString([
    '// Repack runtime initialization logic',
    rspack.Template.getFunctionContent(require('./implementation/init'))
      .replaceAll('$hmrEnabled$', `${config.hmrEnabled ?? false}`)
      .replaceAll('$chunkId$', `"${config.chunkId ?? 'unknown'}"`)
      .replaceAll('$chunkLoadingGlobal$', `"${config.chunkLoadingGlobal}"`)
      .replaceAll('$globalObject$', config.globalObject),
  ]);
}
