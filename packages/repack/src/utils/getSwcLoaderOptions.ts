function getEnvironmentPreset() {
  return {
    // disable all transforms (node supports everything)
    targets: { node: 24 },
    // add transforms manually that match the RN preset
    include: [
      'transform-block-scoping',
      'transform-class-properties',
      'transform-private-methods',
      'transform-private-property-in-object',
      'transform-classes',
      'transform-destructuring',
      'transform-async-to-generator',
      'transform-async-generator-functions',
      'transform-unicode-regex',
      'transform-named-capturing-groups-regex',
      'transform-optional-chaining',
      // dependencies of some of the transforms above
      'transform-spread',
      'transform-object-rest-spread',
      'transform-class-static-block',
      // class transform injects 'use strict' at all times, enabled to prevent parser errors with non-simple params like rest params
      // reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Strict_non_simple_params
      'transform-parameters',
      // compat mostly for symbol-keyed methods
      'transform-function-name',
    ],
  };
}

function getCompilerAssumptions(): Record<string, boolean> {
  return {
    // Loose mode for: transform-class-properties
    setPublicClassFields: true,
    // Loose mode for: transform-private-fields, transform-private-property-in-object
    privateFieldsAsProperties: true,
  };
}

function getParserOptions(syntax: 'js' | 'ts', jsx: boolean) {
  return syntax === 'js'
    ? {
        syntax: 'ecmascript',
        jsx: jsx,
        exportDefaultFrom: true,
      }
    : {
        syntax: 'typescript',
        tsx: jsx,
      };
}

function getJSCTransformOptions(
  jsxRuntime: 'automatic' | 'classic',
  importSource: string
) {
  return {
    react: {
      runtime: jsxRuntime,
      development: jsxRuntime === 'classic',
      importSource,
    },
  };
}

function getModuleOptions(
  disableImportExportTransform: boolean,
  lazyImports: boolean | string[] = false
) {
  return disableImportExportTransform
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
}

/**
 * Interface for {@link getSwcLoaderOptions} options.
 */
interface MakeSwcLoaderConfigOptions {
  /**
   * The source code syntax type.
   * Use 'js' for JavaScript or 'ts' for TypeScript source files.
   */
  syntax: 'js' | 'ts';

  /**
   * Whether to enable JSX/TSX parsing and transformation.
   */
  jsx: boolean;

  /**
   * Whether to use external helpers for transformations.
   * See SWC `jsc.externalHelpers` documentation:
   * https://swc.rs/docs/configuration/compilation#jscexternalhelpers
   */
  externalHelpers?: boolean;

  /**
   * The JSX runtime to use - 'automatic' for React 17+ new JSX transform or 'classic' for traditional JSX transform.
   * See SWC `jsc.transform.react.runtime`:
   * https://swc.rs/docs/configuration/compilation#jsctransformreactruntime
   */
  jsxRuntime?: 'automatic' | 'classic';

  /**
   * Whether to disable transformation of import/export statements.
   */
  disableImportExportTransform?: boolean;

  /**
   * The source module for JSX runtime imports.
   * See SWC `jsc.transform.react.importSource`:
   * https://swc.rs/docs/configuration/compilation#jsctransformreactimportsource
   */
  importSource?: string;

  /**
   * Enable lazy loading for all imports or specific modules.
   * See SWC `module.lazy`:
   * https://swc.rs/docs/configuration/modules#lazy
   */
  lazyImports?: boolean | string[];
}

/**
 * Creates SWC loader configuration options for React Native bundling.
 *
 * @param options Configuration options for the SWC loader
 * @param options.syntax The source code syntax type ('js' for JavaScript or 'ts' for TypeScript)
 * @param options.jsx Whether to enable JSX parsing and transformation
 * @param options.externalHelpers Whether to use external helpers for transformations (equivalent of `@babel/runtime`)
 * @param options.jsxRuntime The JSX runtime to use ('automatic' for React 17+ new JSX transform or 'classic' for traditional JSX transform)
 * @param options.disableImportExportTransform Whether to disable transformation of import/export statements
 * @param options.importSource The source module for JSX runtime imports (defaults to 'react')
 * @param options.lazyImports Enable lazy loading for all imports or specific modules
 *
 * @returns SWC loader configuration for the React Native target
 */
export function getSwcLoaderOptions({
  syntax,
  jsx,
  externalHelpers = true,
  jsxRuntime = 'automatic',
  disableImportExportTransform = false,
  importSource = 'react',
  lazyImports = false,
}: MakeSwcLoaderConfigOptions) {
  return {
    env: getEnvironmentPreset(),
    jsc: {
      assumptions: getCompilerAssumptions(),
      externalHelpers: externalHelpers,
      parser: getParserOptions(syntax, jsx),
      transform: getJSCTransformOptions(jsxRuntime, importSource),
    },
    module: getModuleOptions(disableImportExportTransform, lazyImports),
  };
}
