import { rspack } from '@rspack/core';
import type {
  LoaderContext,
  SwcLoaderOptions,
  SwcLoaderParserConfig,
} from '@rspack/core';
import {
  getSupportedSwcConfigurableTransforms,
  getSupportedSwcCustomTransforms,
  getSupportedSwcNormalTransforms,
} from '../../utils/internal/index.js';
import { transform } from '../babelLoader/index.js';
import type { HybridJsLoaderOptions } from './options.js';
import {
  getProjectBabelConfig,
  isTSXSource,
  isTypeScriptSource,
} from './utilts.js';

type BabelTransform = [string, Record<string, any> | undefined];

const swc = rspack.experiments.swc;

export const raw = false;

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

  const includeBabelPlugins: Array<string | [string, Record<string, any>]> = [];

  let parserConfig: SwcLoaderParserConfig;
  // add TS syntax plugins since RN preset
  // only uses transform-typescript plugin
  // which includes the syntax-typescript plugin
  if (isTypeScriptSource(this.resourcePath)) {
    parserConfig = { syntax: 'typescript', tsx: false };
    includeBabelPlugins.push([
      '@babel/plugin-syntax-typescript',
      { isTSX: false, allowNamespaces: true },
    ]);
  } else if (isTSXSource(filename)) {
    parserConfig = { syntax: 'typescript', tsx: true };
    includeBabelPlugins.push([
      '@babel/plugin-syntax-typescript',
      { isTSX: true, allowNamespaces: true },
    ]);
  } else {
    // include JSX in .js files
    parserConfig = { syntax: 'ecmascript', jsx: true };
  }

  const babelConfig = getProjectBabelConfig(projectRoot);
  const babelTransforms =
    babelConfig.plugins?.map((p) => [p.key, p.options] as BabelTransform) ?? [];

  let normalTransforms: string[] = [];
  let configurableTransforms: string[] = [];
  let customTransforms: string[] = [];

  let swcConfig: SwcLoaderOptions = {
    jsc: {
      parser: parserConfig,
      transform: { react: { useBuiltins: true } },
    },
  };

  normalTransforms = getSupportedSwcNormalTransforms(babelTransforms);
  ({ swcConfig, transformNames: configurableTransforms } =
    getSupportedSwcConfigurableTransforms(babelTransforms, swcConfig));
  ({ swcConfig, transformNames: customTransforms } =
    getSupportedSwcCustomTransforms(babelTransforms, swcConfig));

  const excludeBabelPlugins: string[] = [
    ...normalTransforms,
    ...configurableTransforms,
    ...customTransforms,
  ];

  const babelResult = await transform(source, {
    caller: { name: '@callstack/repack/hybrid-js-loader' },
    filename: this.resourcePath,
    root: projectRoot,
    sourceMaps: this.sourceMap,
    excludePlugins: excludeBabelPlugins,
    includePlugins: includeBabelPlugins,
  });

  const finalSwcConfig: SwcLoaderOptions = {
    ...swcConfig,
    // set env based on babel transforms
    env: {
      targets: { node: 24 },
      include: [...normalTransforms, ...configurableTransforms],
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
