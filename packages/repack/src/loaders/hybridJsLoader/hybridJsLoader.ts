import type { LoaderContext, SwcLoaderOptions } from '@rspack/core';
import {
  getSupportedSwcConfigurableTransforms,
  getSupportedSwcCustomTransforms,
  getSupportedSwcNormalTransforms,
} from '../../utils/internal/index.js';
import { transform } from '../babelLoader/index.js';
import { type HybridJsLoaderOptions, getOptions } from './options.js';
import {
  getProjectBabelConfig,
  isTSXSource,
  isTypeScriptSource,
} from './utilts.js';

type BabelTransform = [string, Record<string, any> | undefined];

export const raw = false;

export default function hybridJsLoader(
  this: LoaderContext<HybridJsLoaderOptions>,
  source: string
) {
  this.cacheable();
  const callback = this.async();
  const options = getOptions(this);
  const { swc } = this._compiler.rspack.experiments;

  const filename = this.resourcePath;
  const includeBabelPlugins: Array<string | [string, Record<string, any>]> = [];

  // add TS syntax plugins since RN preset only uses transform-typescript plugin
  // which includes the syntax plugin under the hood
  if (isTypeScriptSource(this.resourcePath)) {
    includeBabelPlugins.push([
      '@babel/plugin-syntax-typescript',
      { isTSX: false, allowNamespaces: true },
    ]);
  } else if (isTSXSource(filename)) {
    includeBabelPlugins.push([
      '@babel/plugin-syntax-typescript',
      { isTSX: true, allowNamespaces: true },
    ]);
  }

  const babelConfig = getProjectBabelConfig(options.projectRoot);
  const babelTransforms =
    babelConfig.plugins?.map((p) => [p.key, p.options] as BabelTransform) ?? [];

  let normalTransforms: string[] = [];
  let configurableTransforms: string[] = [];
  let customTransforms: string[] = [];
  let swcConfig: SwcLoaderOptions = {
    env: { targets: { node: 24 } },
    jsc: {
      parser: { syntax: 'ecmascript' },
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

  const babelResult = transform({
    filename: this.resourcePath,
    src: source,
    options: {
      enableBabelRCLookup: true,
      excludePlugins: excludeBabelPlugins,
      includePlugins: includeBabelPlugins,
      projectRoot: options.projectRoot,
    },
  });

  const swcResult = swc.transformSync(babelResult?.code!, {
    // @ts-expect-error bad typing in rspack/swc
    inputSourceMap: babelResult?.map,
    ...swcConfig,
  });

  callback(null, swcResult?.code, swcResult?.map);
}
