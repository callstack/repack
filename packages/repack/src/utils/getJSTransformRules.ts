function getCompilerAssumptions() {
  return {
    /**
     *  Loose mode for:
     *  - transform-class-properties
     */
    setPublicClassFields: true,
    /**
     *  Loose mode for:
     *  - transform-private-fields
     *  - transform-private-property-in-object
     */
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
      };
}

interface MakeSwcLoaderConfigOptions {
  syntax: 'js' | 'ts';
  jsx: boolean;
  externalHelpers?: boolean;
  jsxRuntime?: 'automatic' | 'classic';
  disableImportExportTransform?: boolean;
  importSource?: string;
  lazyImports?: boolean | string[];
}

const makeSwcLoaderConfig = ({
  syntax,
  jsx,
  externalHelpers = true,
  jsxRuntime = 'automatic',
  disableImportExportTransform = false,
  importSource = 'react',
  lazyImports = false,
}: MakeSwcLoaderConfigOptions) => ({
  loader: 'builtin:swc-loader',
  options: {
    env: {
      // disable all transforms
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
      ],
    },
    jsc: {
      assumptions: getCompilerAssumptions(),
      externalHelpers: externalHelpers,
      parser: getParserOptions(syntax, jsx),
      transform: getJSCTransformOptions(jsxRuntime, importSource),
    },
    module: getModuleOptions(disableImportExportTransform, lazyImports),
  },
});

export function getJSTransformRules() {
  return [
    {
      type: 'javascript/auto',
      test: /\.([cm]?[jt]sx?|flow)$/,
      oneOf: [
        {
          test: /jsx?$/,
          use: [
            makeSwcLoaderConfig({
              syntax: 'js',
              jsx: true,
              importSource: 'nativewind',
            }),
          ],
        },
        {
          test: /ts$/,
          use: [
            makeSwcLoaderConfig({
              syntax: 'ts',
              jsx: false,
              importSource: 'nativewind',
            }),
          ],
        },
        {
          test: /tsx$/,
          use: [
            makeSwcLoaderConfig({
              syntax: 'ts',
              jsx: true,
              importSource: 'nativewind',
            }),
          ],
        },
      ],
    },
  ];
}
