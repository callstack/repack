import {
  type BabelFileResult,
  createConfigItem,
  loadOptions,
  loadPartialConfig,
  type ParseResult,
  parseSync,
  type TransformOptions,
  transformFromAstSync,
} from '@babel/core';
import type { LoaderContext, RawSourceMap } from '@rspack/core';
import { getFlowEnumsPlugins } from '../../helpers/resolveReactNativeParser.js';
import type {
  BabelLoaderOptions,
  BabelPluginOverrides,
  CustomTransformOptions,
} from './options.js';
import {
  isIgnoredRepackDeepImport,
  isTSXSource,
  isTypeScriptSource,
  normalizeInputSourceMap,
  parseReactNativeSource,
  shouldUseReactNativeParser,
} from './utils.js';

export const raw = false;

function buildBabelConfig(
  babelOptions: TransformOptions,
  {
    includePlugins,
    excludePlugins,
    lowerFlowEnums,
  }: BabelPluginOverrides & { lowerFlowEnums: boolean }
): TransformOptions {
  const config: TransformOptions = {
    babelrc: true,
    highlightCode: true,
    comments: true,
    sourceType: 'unambiguous',
    ...babelOptions,
    // a copy: loader options are shared between modules
    plugins: [...(babelOptions.plugins ?? []), ...(includePlugins ?? [])],
    // output settings
    ast: false,
    code: true,
    cloneInputAst: false,
    // disable optimization through babel
    compact: false,
    minified: false,
  };

  const partialConfig = loadPartialConfig(config);
  if (!partialConfig) {
    throw new Error('Failed to load babel config');
  }

  const { options } = partialConfig;
  if (lowerFlowEnums) {
    // top-level plugins run ahead of the preset, which strips enums before
    // its own enum plugin runs; `root` is resolved by Babel at this point
    options.plugins = [
      ...getFlowEnumsPlugins(options.root!).map((plugin) =>
        createConfigItem(plugin, { type: 'plugin' })
      ),
      ...(options.plugins ?? []),
    ];
  }

  const babelConfig = loadOptions(options);
  if (!babelConfig) {
    throw new Error('Failed to load babel config');
  }

  if (excludePlugins && babelConfig.plugins) {
    const excludedPlugins = new Set(excludePlugins);
    babelConfig.plugins = babelConfig.plugins.filter(
      (plugin: { key: string }) =>
        !(
          excludedPlugins.has(plugin.key) ||
          (plugin.key === 'warn-on-deep-imports' &&
            isIgnoredRepackDeepImport(babelOptions.filename!))
        )
    );
  }

  return babelConfig;
}

type BabelTransformResult = BabelFileResult & {
  sourceType: 'script' | 'module';
};

export const transform = async (
  src: string,
  transformOptions: TransformOptions,
  customOptions?: CustomTransformOptions
): Promise<BabelTransformResult> => {
  // filename is always set by the loaders
  const isTypeScript =
    isTypeScriptSource(transformOptions.filename!) ||
    isTSXSource(transformOptions.filename!);

  const babelConfig = buildBabelConfig(transformOptions, {
    includePlugins: customOptions?.includePlugins,
    excludePlugins: customOptions?.excludePlugins,
    lowerFlowEnums: !isTypeScript,
  });
  const projectRoot = babelConfig.root ?? babelConfig.cwd;

  const needsReactNativeParser =
    !isTypeScript &&
    shouldUseReactNativeParser(src, customOptions?.hermesParserOverrides?.flow);

  let sourceAst: ParseResult | null;
  if (needsReactNativeParser) {
    // the parser comes from the preset
    sourceAst = await parseReactNativeSource(src, {
      projectRoot: projectRoot ?? process.cwd(),
      parserPath: customOptions?.hermesParserPath,
      sourceType: babelConfig.sourceType,
      overrides: customOptions?.hermesParserOverrides,
    });
  } else if (isTypeScript) {
    sourceAst = parseSync(src, babelConfig);
  } else {
    // the RN parser would accept JSX & Flow regardless of babel plugins,
    // keep that working when JSX/Flow transforms are excluded (e.g. handled by SWC)
    sourceAst = parseSync(src, {
      ...babelConfig,
      parserOpts: {
        ...babelConfig.parserOpts,
        plugins: [...(babelConfig.parserOpts?.plugins ?? []), 'jsx', 'flow'],
      },
    });
  }

  if (!sourceAst) {
    throw new Error(`Failed to parse source file: ${babelConfig.filename}`);
  }

  const result = transformFromAstSync(sourceAst, src, babelConfig);
  if (!result) {
    throw new Error(`Failed to transform source file: ${babelConfig.filename}`);
  }

  const sourceType = sourceAst.program.sourceType;

  return {
    ...result,
    sourceType,
  };
};

export default async function babelLoader(
  this: LoaderContext<BabelLoaderOptions>,
  source: string,
  sourceMap: string | RawSourceMap | undefined
) {
  this.cacheable();
  const callback = this.async();
  const options = this.getOptions();

  const { hermesParserPath, hermesParserOverrides, ...babelOverrides } =
    options;

  const withSourceMaps = this.resourcePath.match(/node_modules/)
    ? false
    : this.sourceMap;

  try {
    const result = await transform(
      source,
      {
        caller: { name: '@callstack/repack' },
        filename: this.resourcePath,
        sourceMaps: withSourceMaps,
        sourceFileName: this.resourcePath,
        inputSourceMap: withSourceMaps
          ? normalizeInputSourceMap(sourceMap)
          : undefined,
        ...babelOverrides,
      },
      {
        hermesParserPath,
        hermesParserOverrides,
      }
    );
    callback(null, result.code ?? undefined, result.map ?? undefined);
  } catch (e) {
    callback(e as Error);
  }
}
