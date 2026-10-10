import {
  type BabelFileResult,
  loadOptions,
  type ParseResult,
  parseSync,
  type TransformOptions,
  transformFromAstSync,
} from '@babel/core';
import type { LoaderContext } from '@rspack/core';
import type {
  BabelLoaderOptions,
  BabelPluginOverrides,
  CustomTransformOptions,
} from './options.js';
import {
  isIgnoredRepackDeepImport,
  isTSXSource,
  isTypeScriptSource,
  parseReactNativeSource,
  shouldUseReactNativeParser,
} from './utils.js';

export const raw = false;

function buildBabelConfig(
  babelOptions: TransformOptions,
  { includePlugins, excludePlugins }: BabelPluginOverrides
): TransformOptions {
  const config: TransformOptions = {
    babelrc: true,
    highlightCode: true,
    comments: true,
    plugins: [],
    sourceType: 'unambiguous',
    ...babelOptions,
    // output settings
    ast: false,
    code: true,
    cloneInputAst: false,
    // disable optimization through babel
    compact: false,
    minified: false,
  };

  if (includePlugins) {
    config.plugins!.push(...includePlugins);
  }

  const babelConfig = loadOptions(config);
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
  const babelConfig = buildBabelConfig(transformOptions, {
    includePlugins: customOptions?.includePlugins,
    excludePlugins: customOptions?.excludePlugins,
  });
  const projectRoot = babelConfig.root ?? babelConfig.cwd;

  // filename will be always defined at this point
  const isTypeScript =
    isTypeScriptSource(babelConfig.filename!) ||
    isTSXSource(babelConfig.filename!);

  const needsReactNativeParser =
    !isTypeScript &&
    shouldUseReactNativeParser(src, customOptions?.hermesParserOverrides?.flow);

  let sourceAst: ParseResult | null;
  if (needsReactNativeParser) {
    // the parser comes from the preset, it also lowers Flow enums that the
    // preset would otherwise strip before its enum plugin runs
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
  sourceMap: string | undefined
) {
  this.cacheable();
  const callback = this.async();
  const options = this.getOptions();

  const { hermesParserPath, hermesParserOverrides, ...babelOverrides } =
    options;

  const inputSourceMap = sourceMap ? JSON.parse(sourceMap) : undefined;
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
        inputSourceMap: withSourceMaps ? inputSourceMap : undefined,
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
