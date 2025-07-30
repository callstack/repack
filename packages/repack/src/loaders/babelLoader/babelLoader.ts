import fs from 'node:fs';
import path from 'node:path';
import {
  type Node,
  type TransformOptions,
  parseSync,
  transformFromAstSync,
} from '@babel/core';
// @ts-ignore
import * as hermesParser from 'hermes-parser';

import type { LoaderContext } from '@rspack/core';
import { type BabelLoaderOptions, getOptions } from './options.js';
import { repackBabelPreset } from './preset.js';

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
  projectRoot: string;
  babelConfig?: TransformOptions;
}
/**
 * Return a memoized function that checks for the existence of a
 * project level .babelrc file, and if it doesn't exist, reads the
 * default RN babelrc file and uses that.
 */
const getBabelRC = (() => {
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
  // If a pre-computed babel config is provided, use it directly
  if (options.babelConfig) {
    const extraConfig: TransformOptions = {
      code: true,
      cwd: options.projectRoot,
      filename,
      highlightCode: true,
      compact: false,
      comments: true,
      minified: false,
    };

    return { ...options.babelConfig, ...extraConfig };
  }

  // Otherwise, use the existing logic to load from project
  const babelRC = getBabelRC(options);

  const extraConfig: TransformOptions = {
    babelrc: options.enableBabelRCLookup ?? true,
    code: true,
    cwd: options.projectRoot,
    filename,
    highlightCode: true,
    compact: false,
    comments: true,
    minified: false,
    presets: [repackBabelPreset],
  };

  return { ...babelRC, ...extraConfig };
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
        // this is currently broken in Rspack and needs to be fixed upstream
        // for now we can pass this as an option to loader
        projectRoot: options.projectRoot,
        babelConfig: options.babelConfig,
      },
    });
    // @ts-ignore
    callback(null, result.code, result.map);
  } catch (e) {
    callback(e as Error);
  }
}
