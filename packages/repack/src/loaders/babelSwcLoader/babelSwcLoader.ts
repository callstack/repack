import type { TransformOptions } from '@babel/core';
import type { LoaderContext, SwcLoaderOptions } from '@rspack/core';
import {
  getSupportedSwcConfigurableTransforms,
  getSupportedSwcCustomTransforms,
  getSupportedSwcNormalTransforms,
} from '../../utils/internal/index.js';
import { transform } from '../babelLoader/index.js';
import {
  getProjectBabelConfig,
  getSwcParserConfig,
  isParallelModeAvailable,
  isTSXSource,
  isTypeScriptSource,
  isWebpackCompiler,
} from './utils.js';

type BabelTransform = [string, Record<string, any> | undefined];
type InputSourceMap = TransformOptions['inputSourceMap'];
type Swc = typeof import('@rspack/core').experiments.swc;

export interface BabelSwcLoaderOptions {
  hideParallelModeWarning?: boolean;
  lazyImports?: boolean | string[];
  projectRoot?: string;
}

export const raw = false;

function getExtraBabelPlugins(filename: string) {
  const extraBabelPlugins: Array<string | [string, Record<string, any>]> = [];
  // add TS syntax plugins since RN preset
  // only uses transform-typescript plugin
  // which includes the syntax-typescript plugin
  if (isTypeScriptSource(filename)) {
    extraBabelPlugins.push([
      '@babel/plugin-syntax-typescript',
      { isTSX: false, allowNamespaces: true },
    ]);
  } else if (isTSXSource(filename)) {
    extraBabelPlugins.push([
      '@babel/plugin-syntax-typescript',
      { isTSX: true, allowNamespaces: true },
    ]);
  }
  return extraBabelPlugins;
}

function partitionTransforms(
  filename: string,
  babelTransforms: BabelTransform[]
) {
  let normalTransforms: string[] = [];
  let configurableTransforms: string[] = [];
  let customTransforms: string[] = [];

  let swcConfig: SwcLoaderOptions = {
    jsc: {
      parser: getSwcParserConfig(filename),
      transform: { react: { useBuiltins: true } },
    },
  };

  normalTransforms = getSupportedSwcNormalTransforms(babelTransforms);
  ({ swcConfig, transformNames: configurableTransforms } =
    getSupportedSwcConfigurableTransforms(babelTransforms, swcConfig));
  ({ swcConfig, transformNames: customTransforms } =
    getSupportedSwcCustomTransforms(babelTransforms, swcConfig));

  const includedSwcTransforms: string[] = [
    ...normalTransforms,
    ...configurableTransforms,
  ];

  const supportedSwcTransforms: string[] = [
    ...includedSwcTransforms,
    ...customTransforms,
  ];

  return { includedSwcTransforms, supportedSwcTransforms, swcConfig };
}

const disabledParalleModeWarning = [
  'You have enabled `experiments.parallelLoader` but forgot to enable it for this loader.',
  'To enable parallel mode for this loader you need to add `parallel: true` to the loader rule.',
  'See how to do it in the official Rspack docs:',
  'https://rspack.rs/config/experiments#experimentsparallelloader.',
  'If this is intentional, you can disable this warning',
  'by setting `hideParallelModeWarning` in the loader options.',
].join(' ');

let parallelModeWarningDisplayed = false;

export default async function babelSwcLoader(
  this: LoaderContext<BabelSwcLoaderOptions>,
  source: string,
  sourceMap: string | undefined
) {
  this.cacheable();
  const callback = this.async();
  const loaderName = '@callstack/repack/babel-swc-loader';
  const logger = this.getLogger('BabelSwcLoader');
  const options = this.getOptions();

  if (
    isParallelModeAvailable(this._compiler) &&
    !parallelModeWarningDisplayed &&
    !options.hideParallelModeWarning
  ) {
    logger.warn(disabledParalleModeWarning);
    parallelModeWarningDisplayed = true;
  }

  const inputSourceMap: InputSourceMap = sourceMap
    ? JSON.parse(sourceMap)
    : undefined;
  const projectRoot = options.projectRoot;
  const lazyImports = options.lazyImports ?? true;

  const baseBabelConfig = {
    caller: { name: loaderName },
    root: projectRoot,
    filename: this.resourcePath,
    sourceMaps: this.sourceMap,
    sourceFileName: this.resourcePath,
    sourceRoot: this.context,
    inputSourceMap: inputSourceMap,
  };

  // TODO this should come from `this._compiler`
  // needs to be exposed in Rspack
  let swc: Swc | null = null;
  if (!isWebpackCompiler(this._compiler)) {
    const rspack = await import('@rspack/core');
    swc = rspack.default.experiments.swc;
  }

  // if swc is not available, use babel to transform everything
  if (!swc) {
    const { code, map } = await transform(source, baseBabelConfig);
    callback(null, code ?? undefined, map ?? undefined);
    return;
  }

  const babelConfig = getProjectBabelConfig(projectRoot);
  const babelTransforms =
    babelConfig.plugins?.map((p) => [p.key, p.options] as BabelTransform) ?? [];

  const includeBabelPlugins = getExtraBabelPlugins(this.resourcePath);
  const { includedSwcTransforms, supportedSwcTransforms, swcConfig } =
    partitionTransforms(this.resourcePath, babelTransforms);

  const babelResult = await transform(source, {
    ...baseBabelConfig,
    excludePlugins: supportedSwcTransforms,
    includePlugins: includeBabelPlugins,
  });

  const finalSwcConfig: SwcLoaderOptions = {
    ...swcConfig,
    // set env based on babel transforms
    env: {
      targets: { node: 24 },
      include: includedSwcTransforms,
    },
    // set lazy imports based on loader options
    module: {
      ...swcConfig.module,
      lazy: lazyImports,
      type: swcConfig.module!.type,
    },
  };

  const swcResult = swc.transformSync(babelResult?.code!, {
    ...finalSwcConfig,
    caller: { name: loaderName },
    filename: this.resourcePath,
    configFile: false,
    swcrc: false,
    root: projectRoot ?? babelConfig.root ?? undefined,
    minify: false,
    sourceMaps: this.sourceMap,
    inputSourceMap: JSON.stringify(babelResult?.map),
    sourceFileName: this.resourcePath,
    sourceRoot: this.context!,
  });

  callback(null, swcResult?.code, swcResult?.map);
}
