import type { PluginSeparationResult } from './babelPluginMapper.js';

interface SwcLoaderOptions {
  env: {
    targets: { node: number };
    include: string[];
  };
  jsc: {
    assumptions: Record<string, boolean>;
    externalHelpers: boolean;
    parser: {
      syntax: 'ecmascript' | 'typescript';
      jsx?: boolean;
      tsx?: boolean;
      exportDefaultFrom?: boolean;
    };
    transform: {
      react: {
        runtime: 'automatic' | 'classic';
        development: boolean;
        importSource: string;
      };
    };
  };
  module?: {
    type: string;
    strict: boolean;
    strictMode: boolean;
    noInterop: boolean;
    lazy: boolean | string[];
    allowTopLevelThis: boolean;
    ignoreDynamic: boolean;
  };
}

export interface GenerateSwcConfigOptions {
  syntax: 'js' | 'ts';
  jsx: boolean;
  externalHelpers?: boolean;
  jsxRuntime?: 'automatic' | 'classic';
  disableImportExportTransform?: boolean;
  importSource?: string;
  lazyImports?: boolean | string[];
  swcCompatiblePlugins: PluginSeparationResult['swcCompatible'];
}

/**
 * Generates SWC loader configuration based on compatible Babel plugins
 */
export function generateSwcConfig({
  syntax,
  jsx,
  externalHelpers = true,
  jsxRuntime = 'automatic',
  disableImportExportTransform = false,
  importSource = 'react',
  lazyImports = false,
  swcCompatiblePlugins,
}: GenerateSwcConfigOptions): SwcLoaderOptions {
  // Extract enabled transforms from compatible plugins
  // SWC's env.include expects the full transform names (e.g., 'transform-classes')
  const enabledTransforms = swcCompatiblePlugins.map(
    ({ swcConfig }) => swcConfig.name
  );

  // Build assumptions based on plugin options
  const assumptions: Record<string, boolean> = {};

  // Check for loose mode settings
  const hasLooseClasses = swcCompatiblePlugins.some(
    ({ swcConfig }) =>
      swcConfig.name === 'transform-class-properties' &&
      swcConfig.options?.loose
  );

  const hasLoosePrivateFields = swcCompatiblePlugins.some(
    ({ swcConfig }) =>
      [
        'transform-private-methods',
        'transform-private-property-in-object',
      ].includes(swcConfig.name) && swcConfig.options?.loose
  );

  if (hasLooseClasses) {
    assumptions.setPublicClassFields = true;
  }

  if (hasLoosePrivateFields) {
    assumptions.privateFieldsAsProperties = true;
  }

  // Build parser options
  const parserOptions =
    syntax === 'js'
      ? {
          syntax: 'ecmascript' as const,
          jsx,
          exportDefaultFrom: true,
        }
      : {
          syntax: 'typescript' as const,
          tsx: jsx,
        };

  // Build module options
  const moduleOptions = disableImportExportTransform
    ? undefined
    : {
        type: 'commonjs',
        strict: false,
        strictMode: false,
        noInterop: false,
        lazy: lazyImports,
        allowTopLevelThis: true,
        ignoreDynamic: true,
      };

  return {
    env: {
      // Disable all transforms by default (node supports everything)
      targets: { node: 24 },
      // Only include transforms that we found in the babel config
      include: enabledTransforms,
    },
    jsc: {
      assumptions,
      externalHelpers,
      parser: parserOptions,
      transform: {
        react: {
          runtime: jsxRuntime,
          development: jsxRuntime === 'classic',
          importSource,
        },
      },
    },
    module: moduleOptions,
  };
}
