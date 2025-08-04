import {
  type ParseResult,
  type TransformOptions,
  loadOptions,
  parseSync,
  transformFromAstSync,
} from '@babel/core';

import type { LoaderContext } from '@rspack/core';
import { type BabelLoaderOptions, getOptions } from './options.js';
import { isTSXSource, isTypeScriptSource, loadHermesParser } from './utils.js';

export const raw = false;

interface CustomTransformOptions {
  caller: { name: string };
  projectRoot: string;
  sourceMaps?: boolean;
  includePlugins?: Array<string | [string, Record<string, any>]>;
  excludePlugins?: string[];
}

function buildBabelConfig(
  filename: string,
  options: CustomTransformOptions
): TransformOptions {
  const extraConfig: TransformOptions = {
    babelrc: true,
    code: true,
    cwd: options.projectRoot,
    root: options.projectRoot,
    filename,
    highlightCode: true,
    compact: false,
    comments: true,
    minified: false,
    plugins: [],
  };

  if (options.includePlugins) {
    extraConfig.plugins!.push(...options.includePlugins);
  }

  const babelConfig = loadOptions(extraConfig);
  if (!babelConfig) {
    throw new Error('Failed to load babel config');
  }

  if (options.excludePlugins && babelConfig.plugins) {
    babelConfig.plugins = babelConfig.plugins.filter(
      (plugin: { key: string }) => {
        return !options.excludePlugins!.includes(plugin.key);
      }
    );
  }

  return babelConfig;
}

export const transform = async ({
  filename,
  options,
  src,
}: {
  filename: string;
  options: CustomTransformOptions;
  src: string;
}) => {
  const builtConfig = buildBabelConfig(filename, options);
  const babelConfig: TransformOptions = {
    caller: options.caller,
    sourceType: 'unambiguous',
    sourceMaps: options.sourceMaps,
    ...builtConfig,
    ast: false,
    cloneInputAst: false,
  };

  // load hermes parser dynamically to match the version from preset
  const hermesParser = await loadHermesParser(options.projectRoot);

  const sourceAst: ParseResult | null =
    isTypeScriptSource(filename) || isTSXSource(filename)
      ? parseSync(src, babelConfig)
      : hermesParser.parse(src, {
          babel: true,
          flow: 'all',
          reactRuntimeTarget: '19',
          sourceType: babelConfig.sourceType,
        });

  return transformFromAstSync(sourceAst!, src, babelConfig);
};

export default async function babelLoader(
  this: LoaderContext<BabelLoaderOptions>,
  source: string
) {
  this.cacheable();
  const callback = this.async();
  const options = getOptions(this);

  try {
    const result = transform({
      filename: this.resourcePath,
      src: source,
      options: {
        caller: { name: '@callstack/repack/babel-loader' },
        excludePlugins: options.excludePlugins,
        // this is currently broken in Rspack and needs to be fixed upstream
        // for now we can pass this as an option to loader
        projectRoot: options.projectRoot,
        sourceMaps: this.sourceMap,
      },
    });
    // @ts-ignore
    callback(null, result.code, result.map);
  } catch (e) {
    callback(e as Error);
  }
}
