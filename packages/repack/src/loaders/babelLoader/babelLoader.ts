import {
  type TransformOptions,
  loadOptions,
  parseSync,
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
  loadHermesParser,
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

export const transform = async (
  src: string,
  transformOptions: TransformOptions,
  customOptions?: CustomTransformOptions
) => {
  const babelConfig = buildBabelConfig(transformOptions, {
    includePlugins: customOptions?.includePlugins,
    excludePlugins: customOptions?.excludePlugins,
  });
  const projectRoot = babelConfig.root ?? babelConfig.cwd;
  // load hermes parser dynamically to match the version from preset
  const hermesParser = await loadHermesParser(
    projectRoot,
    customOptions?.hermesParserPath
  );

  // filename will be always defined at this point
  const sourceAst =
    isTypeScriptSource(babelConfig.filename!) ||
    isTSXSource(babelConfig.filename!)
      ? parseSync(src, babelConfig)
      : hermesParser.parse(src, {
          babel: true,
          reactRuntimeTarget: '19',
          sourceType: babelConfig.sourceType,
          ...customOptions?.hermesParserOverrides,
        });

  if (!sourceAst) {
    throw new Error(`Failed to parse source file: ${babelConfig.filename}`);
  }

  const result = transformFromAstSync(sourceAst, src, babelConfig);
  if (!result) {
    throw new Error(`Failed to transform source file: ${babelConfig.filename}`);
  }

  return result;
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
        caller: { name: '@callstack/repack/babel-loader' },
        filename: this.resourcePath,
        sourceMaps: withSourceMaps,
        sourceFileName: this.resourcePath,
        sourceRoot: this.context,
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
