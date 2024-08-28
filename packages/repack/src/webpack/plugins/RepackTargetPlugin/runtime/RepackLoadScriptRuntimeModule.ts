import { RuntimeGlobals, Template } from '@rspack/core';

export function generateLoadScriptRuntimeModule(chunkId?: string | number) {
  return Template.asString([
    Template.getFunctionContent(require('./implementation/loadScript'))
      .replaceAll('$loadScript$', RuntimeGlobals.loadScript)
      .replaceAll('$caller$', `'${chunkId?.toString()}'`),
  ]);
}
