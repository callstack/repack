import { transformFromAstSync } from '@babel/core';
import type { LoaderContext, RawSourceMap } from '@rspack/core';
import flowRemoveTypes from 'flow-remove-types';
import { resolveFromReactNativePreset } from '../../helpers/resolveReactNativeParser.js';
import { parseReactNativeSource } from '../babelLoader/utils.js';
import { type FlowLoaderOptions, getOptions } from './options.js';

export const raw = false;

// `flow-remove-types` leaves these constructs in place, producing invalid JS:
// `component` / `hook` declarations, enums and `match (...) {` (not `.match(`)
const UNSUPPORTED_FLOW_SYNTAX_REGEX =
  /\b(?:(?:component|hook)\s+[\w$]+\s*[<(]|enum\s+[\w$]+\s*(?:of\s+[\w$]+\s*)?\{)|(?<![.\w$])match\s*\(.*\)\s*\{/;

async function lowerFlowSyntax(
  loaderContext: LoaderContext<FlowLoaderOptions>,
  source: string,
  options: FlowLoaderOptions
) {
  const projectRoot = loaderContext.rootContext;
  const ast = await parseReactNativeSource(source, {
    projectRoot,
    flow: options.all ? 'all' : 'detect',
  });

  const result = transformFromAstSync(ast, source, {
    babelrc: false,
    configFile: false,
    filename: loaderContext.resourcePath,
    // unlike `flow-remove-types`, lowering moves code around
    sourceMaps: loaderContext.sourceMap,
    sourceFileName: loaderContext.resourcePath,
    plugins: [
      resolveFromReactNativePreset(
        projectRoot,
        '@babel/plugin-transform-flow-strip-types'
      ),
    ],
  });

  if (!result?.code) {
    throw new Error(
      `Failed to strip Flow types: ${loaderContext.resourcePath}`
    );
  }

  return { code: result.code, map: result.map ?? undefined };
}

export default function flowLoader(
  this: LoaderContext<FlowLoaderOptions>,
  source: string
) {
  this.cacheable();
  const callback = this.async();
  const options = getOptions(this);

  if (UNSUPPORTED_FLOW_SYNTAX_REGEX.test(source)) {
    lowerFlowSyntax(this, source, options).then(
      ({ code, map }) => callback(null, code, map as RawSourceMap | undefined),
      (error) => callback(error)
    );
    return;
  }

  const result = flowRemoveTypes(source, options);
  const sourceMap = options.pretty ? result.generateMap() : undefined;

  callback(null, result.toString(), sourceMap as RawSourceMap);
}
