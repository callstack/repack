import fs from 'node:fs';
import path from 'node:path';
import {
  type Node,
  type TransformOptions,
  loadOptions,
  parseSync,
  transformFromAstSync,
} from '@babel/core';
// @ts-ignore
import * as hermesParser from 'hermes-parser';

import type { LoaderContext } from '@rspack/core';
import { type BabelLoaderOptions, getOptions } from './options.js';

export const raw = false;

function isTypeScriptSource(fileName: string) {
  return !!fileName && fileName.endsWith('.ts');
}

function isTSXSource(fileName: string) {
  return !!fileName && fileName.endsWith('.tsx');
}

interface CustomOptions {
  enableBabelRCLookup?: boolean;
  extendsBabelConfigPath?: string;
  excludePlugins?: string[];
  projectRoot: string;
}
/**
 * Return a memoized function that checks for the existence of a
 * project level .babelrc file, and if it doesn't exist, reads the
 * default RN babelrc file and uses that.
 */
const _getBabelRC = (() => {
  let babelRC: TransformOptions | null = null;

  return function _getBabelRC({
    projectRoot,
    extendsBabelConfigPath,
  }: CustomOptions) {
    if (babelRC != null) {
      return babelRC;
    }

    babelRC = {
      plugins: [],
      extends: extendsBabelConfigPath,
    };

    if (extendsBabelConfigPath) {
      return babelRC;
    }

    // Let's look for a babel config file in the project root.
    let projectBabelRCPath: string | undefined;

    // .babelrc
    if (projectRoot) {
      projectBabelRCPath = path.resolve(projectRoot, '.babelrc');
    }

    if (projectBabelRCPath) {
      // .babelrc.js
      if (!fs.existsSync(projectBabelRCPath)) {
        projectBabelRCPath = path.resolve(projectRoot, '.babelrc.js');
      }

      // babel.config.js
      if (!fs.existsSync(projectBabelRCPath)) {
        projectBabelRCPath = path.resolve(projectRoot, 'babel.config.js');
      }

      // If we found a babel config file, extend our config off of it
      if (fs.existsSync(projectBabelRCPath)) {
        babelRC.extends = projectBabelRCPath;
      }
    }

    return babelRC;
  };
})();

function buildBabelConfig(
  filename: string,
  options: CustomOptions
): TransformOptions {
  const extraConfig: TransformOptions = {
    babelrc: options.enableBabelRCLookup ?? true,
    code: true,
    cwd: options.projectRoot,
    filename,
    highlightCode: true,
    compact: false,
    comments: true,
    minified: false,
    plugins: [],
  };

  if (isTypeScriptSource(filename)) {
    extraConfig.plugins!.push([
      '@babel/plugin-syntax-typescript',
      { isTSX: false, allowNamespaces: true },
    ]);
  }

  if (isTSXSource(filename)) {
    extraConfig.plugins!.push([
      '@babel/plugin-syntax-typescript',
      { isTSX: true, allowNamespaces: true },
    ]);
  }

  const babelConfig = loadOptions(extraConfig) as any;

  if (options.excludePlugins) {
    babelConfig.plugins = babelConfig.plugins.filter(
      (plugin: { key: string }) => {
        return !options.excludePlugins!.includes(plugin.key);
      }
    );
  }

  // babelConfig.plugins.forEach((plugin: any) => {
  //   console.log(plugin.key);
  // });

  return babelConfig;
}

const transform = ({
  filename,
  options,
  src,
}: {
  filename: string;
  options: CustomOptions;
  src: string;
}) => {
  const builtConfig = buildBabelConfig(filename, options);
  const babelConfig: TransformOptions = {
    sourceType: 'unambiguous',
    ...builtConfig,
    caller: { name: 'repack' },
    ast: false,
    cloneInputAst: false,
  };

  const sourceAst: Node =
    isTypeScriptSource(filename) || isTSXSource(filename)
      ? parseSync(src, babelConfig)
      : hermesParser.parse(src, {
          babel: true,
          flow: 'all',
          reactRuntimeTarget: '19',
          sourceType: babelConfig.sourceType,
        });

  return transformFromAstSync(sourceAst, src, babelConfig);
};

export default function babelLoader(
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
        enableBabelRCLookup: true,
        excludePlugins: options.excludePlugins,
        // this is currently broken in Rspack and needs to be fixed upstream
        // for now we can pass this as an option to loader
        projectRoot: options.projectRoot,
      },
    });
    // @ts-ignore
    callback(null, result.code, result.map);
  } catch (e) {
    callback(e as Error);
  }
}
