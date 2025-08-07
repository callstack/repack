import {
  type TransformOptions,
  loadOptions,
  parseSync,
  transformFromAstSync,
} from '@babel/core';
import type { LoaderContext } from '@rspack/core';
import type { BabelLoaderOptions, CustomTransformOptions } from './options.js';
import {
  isIgnoredRepackDeepImport,
  isTSXSource,
  isTypeScriptSource,
  loadHermesParser,
} from './utils.js';

export const raw = false;

function buildBabelConfig(options: CustomTransformOptions): TransformOptions {
  const { includePlugins, excludePlugins, ...otherOptions } = options;

  const config: TransformOptions = {
    babelrc: true,
    highlightCode: true,
    comments: true,
    plugins: [],
    sourceType: 'unambiguous',
    ...otherOptions,
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
            isIgnoredRepackDeepImport(options.filename!))
        )
    );
  }

  return babelConfig;
}

export const transform = async (
  src: string,
  options: CustomTransformOptions
) => {
  const babelConfig = buildBabelConfig(options);
  const projectRoot = options.root ?? options.cwd;
  // load hermes parser dynamically to match the version from preset
  const hermesParser = await loadHermesParser(projectRoot);

  // filename will be always defined at this point
  const sourceAst =
    isTypeScriptSource(options.filename!) || isTSXSource(options.filename!)
      ? parseSync(src, babelConfig)
      : hermesParser.parse(src, {
          babel: true,
          reactRuntimeTarget: '19',
          sourceType: babelConfig.sourceType,
        });

  if (!sourceAst) {
    throw new Error(`Failed to parse source file: ${options.filename}`);
  }

  const result = transformFromAstSync(sourceAst, src, babelConfig);
  if (!result) {
    throw new Error(`Failed to transform source file: ${options.filename}`);
  }

  return result;
};

export default async function babelLoader(
  this: LoaderContext<BabelLoaderOptions>,
  source: string
) {
  this.cacheable();
  const callback = this.async();
  const options = this.getOptions();

  try {
    const result = await transform(source, {
      sourceMaps: this.sourceMap,
      ...options,
      caller: { name: '@callstack/repack/babel-loader' },
      filename: this.resourcePath,
    });
    callback(null, result.code ?? undefined, result.map ?? undefined);
  } catch (e) {
    callback(e as Error);
  }
}
