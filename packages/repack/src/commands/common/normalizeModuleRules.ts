import {
  // type PluginItem,
  type TransformOptions,
  loadOptions,
} from '@babel/core';
import type { RuleSetRules } from '@rspack/core';
import {
  generateLoaderChain,
  getSupportedSwcTransforms,
} from '../../utils/internal/index.js';

export interface NormalizeModuleRulesOptions {
  bundler: 'rspack' | 'webpack';
  projectRoot: string;
  platform: string;
}

interface BabelProjectConfig extends TransformOptions {
  plugins?: {
    key: string;
    manipulateOptions: (() => void) | undefined;
    post: (() => void) | undefined;
    pre: (() => void) | undefined;
    visitor: unknown;
    parserOverride: unknown;
    generatorOverride: undefined;
    options: Record<string, any>;
    externalDependencies: unknown[];
  }[];
}

function getProjectBabelConfig(projectRoot: string): BabelProjectConfig {
  const babelConfig = loadOptions({
    cwd: projectRoot,
    root: projectRoot,
  });
  return babelConfig ?? {};
}

function configureLoadersForRule(options: NormalizeModuleRulesOptions) {
  try {
    const babelConfig = getProjectBabelConfig(options.projectRoot);

    const supportedSwcTransforms = getSupportedSwcTransforms(
      babelConfig.plugins?.map((p) => p.key) ?? []
    );

    // Generate loader chain for the rule.use field
    const loaderChain = generateLoaderChain({
      projectRoot: options.projectRoot,
      swcRules: supportedSwcTransforms,
      originalBabelConfig: babelConfig,
    });

    return loaderChain;
  } catch (error) {
    // TODO why would we fail?
    console.warn(
      'Failed to normalize repack-loader, falling back to babel-loader:',
      error
    );

    // Fallback to just babel-loader
    return [
      {
        loader: '@callstack/repack/babel-loader',
        parallel: true,
        options: { projectRoot: options.projectRoot },
      },
    ];
  }
}

export function normalizeModuleRules(
  rules: RuleSetRules | undefined,
  options: NormalizeModuleRulesOptions
): RuleSetRules {
  if (!rules) {
    return [];
  }

  // skip swc for webpack for now
  if (options.bundler === 'webpack') {
    return rules;
  }

  const normalizedRules: RuleSetRules = [...rules];
  for (const rule of normalizedRules) {
    if (!rule || typeof rule !== 'object') {
      continue;
    }

    if ('use' in rule && rule.use !== undefined) {
      if (typeof rule.use === 'string' && rule.use === 'repack-loader') {
        rule.use = undefined;
        rule.rules = configureLoadersForRule(options);
      } else if (
        typeof rule.use === 'object' &&
        'loader' in rule.use &&
        rule.use.loader === 'repack-loader'
      ) {
        rule.use = undefined;
        rule.rules = configureLoadersForRule(options);
      }
      // other cases unhandled for now
    }

    // if ('loader' in rule && rule.loader === 'repack-loader') {
  }

  return normalizedRules;
}
