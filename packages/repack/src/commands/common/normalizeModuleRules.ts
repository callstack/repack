import { loadOptions } from '@babel/core';
import type { RuleSetRule } from '@rspack/core';
import {
  analyzeBabelConfig,
  filterTransformPlugins,
  generateLoaderChain,
  separateBabelPlugins,
} from '../../utils/internal/index.js';

export interface NormalizeModuleRulesOptions {
  bundler: 'rspack' | 'webpack';
  projectRoot: string;
  platform: string;
}

/**
 * Checks if a rule contains the repack-loader placeholder
 */
function hasRepackLoader(rule: RuleSetRule): boolean {
  if (!rule.use) return false;

  const uses = Array.isArray(rule.use) ? rule.use : [rule.use];

  return uses.some((use) => {
    if (typeof use === 'string') {
      return use === 'repack-loader';
    }
    if (typeof use === 'object' && use && 'loader' in use) {
      return use.loader === 'repack-loader';
    }
    return false;
  });
}

/**
 * Extracts babel config from the project
 */
function getProjectBabelConfig(projectRoot: string) {
  // Try to load babel config using Babel's config resolution
  const babelConfig = loadOptions({
    cwd: projectRoot,
    filename: `${projectRoot}/dummy.js`, // Dummy filename for config resolution
  });

  return babelConfig || {};
}

/**
 * Determines the syntax and jsx settings based on the rule test pattern
 */
function determineSyntaxFromRule(rule: RuleSetRule): {
  syntax: 'js' | 'ts';
  jsx: boolean;
} {
  const test = rule.test;

  if (!test) {
    return { syntax: 'js', jsx: false };
  }

  const testStr = test.toString();

  // Check for TypeScript
  const isTypeScript = testStr.includes('.ts') || testStr.includes('\\.ts');

  // Check for JSX/TSX
  const hasJsx =
    testStr.includes('.jsx') ||
    testStr.includes('.tsx') ||
    testStr.includes('\\.jsx') ||
    testStr.includes('\\.tsx');

  return {
    syntax: isTypeScript ? 'ts' : 'js',
    jsx: hasJsx,
  };
}

/**
 * Normalizes a single rule by replacing repack-loader with SWC + Babel chain
 */
function normalizeRule(
  rule: RuleSetRule,
  options: NormalizeModuleRulesOptions
): RuleSetRule {
  if (!hasRepackLoader(rule)) {
    return rule;
  }

  try {
    // Get project babel configuration
    const babelConfig = getProjectBabelConfig(options.projectRoot);

    // Analyze babel config to extract plugins
    const analyzed = analyzeBabelConfig(babelConfig);

    // Filter to only transform plugins
    const transformPlugins = filterTransformPlugins(analyzed.plugins);

    // Separate into SWC-compatible and Babel-only plugins
    const separated = separateBabelPlugins(transformPlugins);

    // Determine syntax from rule
    const { syntax, jsx } = determineSyntaxFromRule(rule);

    // Generate loader chain
    const loaderChain = generateLoaderChain({
      projectRoot: options.projectRoot,
      swcCompatiblePlugins: separated.swcCompatible,
      babelOnlyPlugins: separated.babelOnly,
      originalBabelConfig: analyzed.originalConfig,
      syntax,
      jsx,
    });

    // Replace the rule's use array
    return {
      ...rule,
      use: loaderChain,
    };
  } catch (error) {
    console.warn(
      'Failed to normalize repack-loader, falling back to babel-loader:',
      error
    );

    // Fallback to just babel-loader
    return {
      ...rule,
      use: [
        {
          loader: '@callstack/repack/babel-loader',
          options: {
            projectRoot: options.projectRoot,
          },
        },
      ],
    };
  }
}

/**
 * Normalizes module rules by replacing repack-loader placeholders with SWC + Babel chains
 */
export function normalizeModuleRules(
  rules: (RuleSetRule | false | null | undefined | 0 | '')[] | undefined,
  options: NormalizeModuleRulesOptions
): (RuleSetRule | false | null | undefined | 0 | '')[] | undefined {
  if (!rules) return undefined;

  const normalizedRules: (RuleSetRule | false | null | undefined | 0 | '')[] =
    [];

  for (const rule of rules) {
    // Skip falsy values
    if (!rule) {
      normalizedRules.push(rule);
      continue;
    }

    if (rule.oneOf) {
      // Handle oneOf rules
      const normalizedOneOf = rule.oneOf.map((r) =>
        r ? normalizeRule(r, options) : r
      );
      normalizedRules.push({
        ...rule,
        oneOf: normalizedOneOf,
      });
    } else if (rule.rules) {
      // Handle nested rules
      const normalizedNested = normalizeModuleRules(rule.rules, options);
      normalizedRules.push({
        ...rule,
        rules: normalizedNested,
      });
    } else {
      // Handle regular rules
      const normalized = normalizeRule(rule, options);
      normalizedRules.push(normalized);
    }
  }

  return normalizedRules;
}
