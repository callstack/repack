import type { TransformOptions } from '@babel/core';
import type { BabelPlugin } from './babelConfigAnalyzer.js';
import type { PluginSeparationResult } from './babelPluginMapper.js';
import { generateSwcConfig } from './swcConfigGenerator.js';

export interface LoaderEntry {
  loader: string;
  options?: any;
}

export interface GenerateLoaderChainOptions {
  projectRoot: string;
  swcCompatiblePlugins: PluginSeparationResult['swcCompatible'];
  babelOnlyPlugins: BabelPlugin[];
  originalBabelConfig: TransformOptions;
  syntax: 'js' | 'ts';
  jsx: boolean;
}

/**
 * Generates a loader chain with SWC loader followed by Babel loader
 */
export function generateLoaderChain({
  projectRoot,
  swcCompatiblePlugins,
  babelOnlyPlugins,
  originalBabelConfig,
  syntax,
  jsx,
}: GenerateLoaderChainOptions): LoaderEntry[] {
  const loaders: LoaderEntry[] = [];

  // Only add SWC loader if there are compatible plugins
  if (swcCompatiblePlugins.length > 0) {
    const swcConfig = generateSwcConfig({
      syntax,
      jsx,
      swcCompatiblePlugins,
      externalHelpers: true,
      jsxRuntime: 'automatic',
      disableImportExportTransform: false,
      importSource: 'react',
      lazyImports: false,
    });

    loaders.push({
      loader: 'builtin:swc-loader',
      options: swcConfig,
    });
  }

  // Always add Babel loader (either with remaining plugins or full config)
  if (babelOnlyPlugins.length > 0 || swcCompatiblePlugins.length === 0) {
    // Create a new babel config with only the remaining plugins
    const babelConfig: TransformOptions = {
      ...originalBabelConfig,
      plugins: babelOnlyPlugins.map((plugin) =>
        plugin.options ? [plugin.name, plugin.options] : plugin.name
      ),
      // Remove presets since we've already flattened them
      presets: [],
    };

    loaders.push({
      loader: '@callstack/repack/babel-loader',
      options: {
        projectRoot,
        babelConfig, // Pass the pre-computed config
      },
    });
  }

  return loaders;
}
