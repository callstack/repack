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
      targets: {
        'react-native': '0.74',
      },
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
      test: /\.[cm]?[jt]sx?$/,
      oneOf: [
        {
          test: /jsx?$/,
          use: [
            makeSwcLoaderConfig({
              syntax: 'js',
              jsx: true,
              importSource: 'nativewind',
              externalHelpers: true,
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
