import rspack from '@rspack/core';

export function generateLoadScriptRuntimeModule(chunkId?: string | number) {
  return rspack.Template.asString([
    rspack.Template.getFunctionContent(require('./implementation/loadScript'))
      .replaceAll('$loadScript$', rspack.RuntimeGlobals.loadScript)
      .replaceAll('$caller$', `'${chunkId?.toString()}'`),
  ]);
}
