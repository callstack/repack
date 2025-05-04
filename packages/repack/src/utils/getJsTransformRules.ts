import { getCodegenTransformRules } from './getCodegenTransformRules.js';
import { getFlowTransformRules } from './getFlowTransformRules.js';
import { getSwcLoaderOptions } from './getSwcLoaderOptions.js';

/**
 * Interface for {@link getJsTransformRules} options.
 */
interface GetJsTransformRulesOptions {
  /** Configuration options for SWC transformations */
  swc?: {
    /** Whether to disable transformation of import/export statements */
    disableImportExportTransform?: boolean;
    /** Whether to use external helpers for transformations (equivalent of `@babel/runtime`) */
    externalHelpers?: boolean;
    /** The source module for JSX runtime imports (defaults to 'react') */
    importSource?: string;
    /** The JSX runtime to use ('automatic' for React 17+ new JSX transform or 'classic' for traditional JSX transform) */
    jsxRuntime?: 'automatic' | 'classic';
    /** Enable lazy loading for all imports or specific modules */
    lazyImports?: boolean | string[];
  };
  /** Configuration for enabling/disabling Flow transformations */
  flow?: {
    /** Whether to enable Flow transformations in the JavaScript transform pipeline */
    enabled?: boolean;
    /** Array of module names to include for Flow transformation */
    include?: string[];
    /** Array of module names to exclude from Flow transformation */
    exclude?: string[];
    /** If true, bypasses looking for @flow pragma comment before parsing */
    all?: boolean;
    /** If true, removes uninitialized class fields completely rather than only removing the type */
    ignoreUninitializedFields?: boolean;
    /** If true, removes empty import statements which were only used for importing flow types */
    removeEmptyImports?: boolean;
  };
  /** Configuration for enabling/disabling codegen transformations */
  codegen?: {
    /** Whether to enable codegen transformations in the JavaScript transform pipeline */
    enabled?: boolean;
  };
}

/**
 * Generates Rspack `module.rules` configuration for transforming JavaScript, TypeScript, and Flow files.
 * It combines SWC loader configuration for JS/TS files with Flow and codegen transformations.
 * You can consider it an equivalent of `@react-native/babel-preset`, but for SWC.
 *
 * @param options Configuration options for JavaScript/TypeScript transformations
 * @param options.swc Configuration options for SWC transformations
 * @param options.flow Configuration for enabling/disabling Flow transformations
 * @param options.codegen Configuration for enabling/disabling codegen transformations
 *
 * @returns Array of Rspack module rules for transforming JavaScript, TypeScript and Flow files
 */
export function getJsTransformRules(options?: GetJsTransformRulesOptions) {
  const jsRules = getSwcLoaderOptions({
    syntax: 'js',
    jsx: true,
    ...options?.swc,
  });
  const tsRules = getSwcLoaderOptions({
    syntax: 'ts',
    jsx: true,
    ...options?.swc,
  });
  const tsxRules = getSwcLoaderOptions({
    syntax: 'ts',
    jsx: true,
    ...options?.swc,
  });

  const flowRules =
    options?.flow?.enabled !== false
      ? getFlowTransformRules(options?.flow)
      : [];

  const codegenRules =
    options?.codegen?.enabled !== false ? getCodegenTransformRules() : [];

  return [
    {
      type: 'javascript/auto',
      test: /\.([cm]?[jt]sx?|flow)$/,
      oneOf: [
        {
          test: /jsx?$/,
          use: { loader: 'builtin:swc-loader', options: jsRules },
        },
        {
          test: /ts$/,
          use: { loader: 'builtin:swc-loader', options: tsRules },
        },
        {
          test: /tsx$/,
          use: { loader: 'builtin:swc-loader', options: tsxRules },
        },
      ],
    },
    ...flowRules,
    ...codegenRules,
  ];
}
