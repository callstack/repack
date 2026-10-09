import { loadOptions } from '@babel/core';
import type {
  experiments,
  LoaderContext,
  SwcLoaderParserConfig,
} from '@rspack/core';
import { importDefaultESM } from '../../helpers/index.js';

type Swc = (typeof experiments)['swc'];

export function isTypeScriptSource(fileName: string) {
  return !!fileName && fileName.endsWith('.ts');
}

export function isTSXSource(fileName: string) {
  return !!fileName && fileName.endsWith('.tsx');
}

export function getProjectBabelConfig(filename: string, projectRoot?: string) {
  const babelConfig = loadOptions({
    caller: { name: '@callstack/repack' },
    filename,
    root: projectRoot,
  });
  return babelConfig ?? {};
}

export function getExtraBabelPlugins(filename: string) {
  const extraBabelPlugins: Array<string | [string, Record<string, any>]> = [];
  // add TS syntax plugins since RN preset
  // only uses transform-typescript plugin
  // which includes the syntax-typescript plugin
  if (isTypeScriptSource(filename)) {
    extraBabelPlugins.push([
      '@babel/plugin-syntax-typescript',
      { isTSX: false, allowNamespaces: true },
    ]);
  } else if (isTSXSource(filename)) {
    extraBabelPlugins.push([
      '@babel/plugin-syntax-typescript',
      { isTSX: true, allowNamespaces: true },
    ]);
  }
  return extraBabelPlugins;
}

export function getSwcParserConfig(filename: string): SwcLoaderParserConfig {
  if (isTypeScriptSource(filename)) {
    return { syntax: 'typescript', tsx: false };
  }
  if (isTSXSource(filename)) {
    return { syntax: 'typescript', tsx: true };
  }
  // include JSX in .js files
  return { syntax: 'ecmascript', jsx: true };
}

function isWebpackBackend(loaderContext: LoaderContext) {
  // parallel loader in Rspack has mocked compiler object without most props
  // but in non-parallel mode, full compiler object is available so we can do the proper check
  // we distinguish between parallel and non-parallel mode by checking if the compiler has a version property
  // and then proceed to check if it's a Rspack compiler the official way
  if (
    'webpack' in loaderContext._compiler &&
    'version' in loaderContext._compiler.webpack &&
    loaderContext._compiler.webpack.version
  ) {
    return !('rspackVersion' in loaderContext._compiler.webpack);
  }
  // in threaded-loader mode, _compiler.webpack is undefined
  // loaderContext.webpack exists in webpack but not in Rspack
  // in case it's added in the future, it should be followed by similar rspack prop
  if ('webpack' in loaderContext && loaderContext.webpack) {
    return !('rspack' in loaderContext && loaderContext.rspack);
  }
  // if both checks fail, we assume it's a Rspack compiler
  return false;
}

function safelyResolve(path: string, from: string): string | null {
  try {
    return require.resolve(path, { paths: [from] });
  } catch {
    return null;
  }
}

async function getSwcModule(loaderContext: LoaderContext): Promise<Swc | null> {
  if (!isWebpackBackend(loaderContext)) {
    // Rspack exposes its bundled SWC, also to parallel loaders
    return loaderContext._compiler.rspack.experiments.swc;
  }
  // webpack - use `@swc/core` installed in the project
  const swcCorePath = safelyResolve('@swc/core', loaderContext.rootContext);
  if (swcCorePath) {
    const swc = await importDefaultESM<Swc>(swcCorePath);
    return swc;
  }
  // at this point, we've tried all possible ways to get swc and failed
  return null;
}

function createLazyGetSwc(): (
  loaderContext: LoaderContext
) => Promise<Swc | null> {
  let swc: Swc | Promise<Swc | null> | null | undefined;

  const getSwc = async (loaderContext: LoaderContext) => {
    if (swc === undefined) {
      swc = getSwcModule(loaderContext);
    }
    return await swc;
  };
  return getSwc;
}

export const lazyGetSwc = createLazyGetSwc();
