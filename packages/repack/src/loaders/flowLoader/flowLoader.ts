import type { PluginObj } from '@babel/core';
import type { LoaderContext, RawSourceMap } from '@rspack/core';
import flowRemoveTypes from 'flow-remove-types';
import { resolveFromReactNativePreset } from '../../helpers/resolveReactNativeParser.js';
import { parseReactNativeSource } from '../babelLoader/utils.js';
import { type FlowLoaderOptions, getOptions } from './options.js';

export const raw = false;

// `flow-remove-types` leaves these constructs in place, producing invalid JS:
// `component` / `hook` declarations, enums and `match (...)`. `match(` also
// hits plain calls (not `.match(`); those only take the slower path.
const UNSUPPORTED_FLOW_SYNTAX_REGEX =
  /\b(?:(?:component|hook)\s+[\w$]+\s*[<(]|enum\s+[\w$]+\s*(?:of\s+[\w$]+\s*)?\{)|(?<![.\w$])match\s*\(/;

/**
 * Whether a Flow source uses syntax that `flow-remove-types` can't strip and
 * has to be lowered by the React Native parser instead.
 */
export function needsFlowLowering(source: string): boolean {
  return UNSUPPORTED_FLOW_SYNTAX_REGEX.test(source);
}

// mirrors `flow-remove-types`' `ignoreUninitializedFields`
const removeUninitializedClassFields: PluginObj = {
  visitor: {
    ClassProperty(path) {
      if (path.node.value == null) path.remove();
    },
  },
};

async function lowerFlowSyntax(
  loaderContext: LoaderContext<FlowLoaderOptions>,
  source: string,
  options: FlowLoaderOptions
) {
  // only lowered files need Babel, which comes from the project
  const babel: typeof import('@babel/core') = require('@babel/core');
  const projectRoot = loaderContext.rootContext;
  const ast = await parseReactNativeSource(source, {
    projectRoot,
    flow: options.all ? 'all' : 'detect',
  });

  const result = babel.transformFromAstSync(ast, source, {
    babelrc: false,
    configFile: false,
    filename: loaderContext.resourcePath,
    // unlike `flow-remove-types`, lowering moves code around
    sourceMaps: loaderContext.sourceMap,
    sourceFileName: loaderContext.resourcePath,
    plugins: [
      [
        resolveFromReactNativePreset(
          projectRoot,
          '@babel/plugin-transform-flow-strip-types'
        ),
        // keep uninitialized fields like `flow-remove-types` does by default
        { allowDeclareFields: true },
      ],
      ...(options.ignoreUninitializedFields
        ? [removeUninitializedClassFields]
        : []),
    ],
  });

  if (!result?.code) {
    throw new Error(
      `Failed to strip Flow types: ${loaderContext.resourcePath}`
    );
  }

  return { code: result.code, map: result.map ?? undefined };
}

export default async function flowLoader(
  this: LoaderContext<FlowLoaderOptions>,
  source: string
) {
  this.cacheable();
  const callback = this.async();
  const options = getOptions(this);

  try {
    if (needsFlowLowering(source)) {
      const { code, map } = await lowerFlowSyntax(this, source, options);
      callback(null, code, map as RawSourceMap | undefined);
      return;
    }

    const result = flowRemoveTypes(source, options);
    const sourceMap = options.pretty ? result.generateMap() : undefined;
    callback(null, result.toString(), sourceMap as RawSourceMap);
  } catch (error) {
    callback(error as Error);
  }
}
