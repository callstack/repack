import type { TransformOptions } from '@babel/core';
import type { LoaderContext, SwcLoaderOptions } from '@rspack/core';
import { transform } from '../babelLoader/babelLoader.js';
import type { BabelSwcLoaderOptions } from './options.js';
import {
  getSupportedSwcConfigurableTransforms,
  getSupportedSwcCustomTransforms,
  getSupportedSwcNormalTransforms,
} from './swc.js';
import {
  checkParallelModeAvailable,
  getExtraBabelPlugins,
  getProjectBabelConfig,
  getProjectRootPath,
  getSwcParserConfig,
  lazyGetSwc,
} from './utils.js';

type BabelTransform = [string, Record<string, any> | undefined];
type InputSourceMap = TransformOptions['inputSourceMap'];

export const raw = false;

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

  if (!options.hideParallelModeWarning) {
    checkParallelModeAvailable(this, logger);
  }

  const inputSourceMap: InputSourceMap = sourceMap
    ? JSON.parse(sourceMap)
    : undefined;
  const lazyImports = options.lazyImports ?? true;
  const projectRoot = getProjectRootPath(this);

  const withSourceMaps = this.resourcePath.match(/node_modules/)
    ? false
    : this.sourceMap;

  const baseBabelConfig: TransformOptions = {
    caller: { name: loaderName },
    root: projectRoot,
    filename: this.resourcePath,
    sourceMaps: withSourceMaps,
    sourceFileName: this.resourcePath,
    sourceRoot: this.context,
    inputSourceMap: withSourceMaps ? inputSourceMap : undefined,
    ...options.babelOverrides,
  };

  try {
    const swc = await lazyGetSwc(this);
    // if swc is not available, use babel to transform everything
    if (!swc) {
      const { code, map } = await transform(source, baseBabelConfig, {
        hermesParserPath: options.hermesParserPath,
        hermesParserOverrides: options.hermesParserOverrides,
      });
      callback(null, code ?? undefined, map ?? undefined);
      return;
    }

    const babelConfig = getProjectBabelConfig(this.resourcePath, projectRoot);
    const detectedBabelTransforms =
      babelConfig.plugins?.map((p) => [p.key, p.options] as BabelTransform) ??
      [];

    const includeBabelPlugins = getExtraBabelPlugins(this.resourcePath);
    const { includedSwcTransforms, supportedSwcTransforms, swcConfig } =
      partitionTransforms(this.resourcePath, detectedBabelTransforms);

    const babelResult = await transform(source, baseBabelConfig, {
      excludePlugins: supportedSwcTransforms,
      includePlugins: includeBabelPlugins,
      hermesParserPath: options.hermesParserPath,
      hermesParserOverrides: options.hermesParserOverrides,
    });

    const finalSwcConfig: SwcLoaderOptions = {
      ...swcConfig,
      // set env based on babel transforms
      env: {
        // node supports everything and does not include
        // any transforms by default, so it can as a template
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
      sourceMaps: withSourceMaps,
      inputSourceMap: withSourceMaps
        ? JSON.stringify(babelResult?.map)
        : undefined,
      sourceFileName: this.resourcePath,
      sourceRoot: this.context!,
      ...options.swcOverrides,
    });

    callback(null, swcResult?.code, swcResult?.map);
  } catch (error) {
    callback(error as Error);
  }
}
