import type { LoaderContext, SwcLoaderOptions } from '@rspack/core';
import {
  getSupportedSwcConfigurableTransforms,
  getSupportedSwcCustomTransforms,
  getSupportedSwcNormalTransforms,
} from '../../utils/internal/index.js';
import { transform } from '../babelLoader/index.js';
import type { HybridJsLoaderOptions } from './options.js';
import {
  getProjectBabelConfig,
  getSwcParserConfig,
  isTSXSource,
  isTypeScriptSource,
  isWebpackCompiler,
} from './utils.js';

type BabelTransform = [string, Record<string, any> | undefined];
type Swc = typeof import('@rspack/core').experiments.swc;

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

export default async function hybridJsLoader(
  this: LoaderContext<HybridJsLoaderOptions>,
  source: string
) {
  this.cacheable();
  const callback = this.async();
  const options = this.getOptions();

  const filename = this.resourcePath;
  const projectRoot = options.projectRoot;
  const lazyImports = options.lazyImports ?? true;

  let swc: Swc | null = null;
  if (!isWebpackCompiler(this._compiler)) {
    const rspack = await import('@rspack/core');
    swc = rspack.default.experiments.swc;
  }

  // if swc is not available, use babel to transform everything
  if (!swc) {
    const { code, map } = await transform(source, {
      caller: { name: '@callstack/repack/hybrid-js-loader' },
      filename: this.resourcePath,
      root: projectRoot,
      sourceMaps: this.sourceMap,
    });
    callback(null, code ?? undefined, map ?? undefined);
    return;
  }

  const babelConfig = getProjectBabelConfig(projectRoot);
  const babelTransforms =
    babelConfig.plugins?.map((p) => [p.key, p.options] as BabelTransform) ?? [];

  const includeBabelPlugins = getExtraBabelPlugins(filename);
  const { includedSwcTransforms, supportedSwcTransforms, swcConfig } =
    partitionTransforms(filename, babelTransforms);

  const babelResult = await transform(source, {
    caller: { name: '@callstack/repack/hybrid-js-loader' },
    filename: this.resourcePath,
    root: projectRoot,
    sourceMaps: this.sourceMap,
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
    filename: this.resourcePath,
    root: projectRoot,
    sourceMaps: this.sourceMap,
    // TODO potentially optimize with fast-stringify
    inputSourceMap: JSON.stringify(babelResult?.map),
    // TODO is this needed?
    sourceRoot: babelResult?.map?.sourceRoot,
    sourceFileName: babelResult?.map?.file,
    minify: false,
    configFile: false,
    swcrc: false,
    caller: { name: 'repack-hybrid-js-loader' },
  });

  callback(null, swcResult?.code, swcResult?.map);
}
