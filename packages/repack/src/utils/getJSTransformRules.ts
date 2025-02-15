import { getCodegenTransformRules } from './getCodegenTransformRules.js';
import { getFlowTransformRules } from './getFlowTransformRules.js';
import { getSwcLoaderOptions } from './getSwcLoaderOptions.js';

interface GetJsTransformRulesOptions {
  swc?: {
    disableImportExportTransform?: boolean;
    externalHelpers?: boolean;
    importSource?: string;
    jsxRuntime?: 'automatic' | 'classic';
    lazyImports?: boolean | string[];
  };
  flow?: {
    enabled?: boolean;
    include?: string[];
    exclude?: string[];
    all?: boolean;
    ignoreUninitializedFields?: boolean;
  };
  codegen?: {
    enabled?: boolean;
  };
}

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
