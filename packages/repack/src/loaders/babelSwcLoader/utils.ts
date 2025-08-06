import { loadOptions } from '@babel/core';
import type {
  LoaderContext,
  SwcLoaderParserConfig,
  experiments,
} from '@rspack/core';

type Swc = (typeof experiments)['swc'];

export function isTypeScriptSource(fileName: string) {
  return !!fileName && fileName.endsWith('.ts');
}

export function isTSXSource(fileName: string) {
  return !!fileName && fileName.endsWith('.tsx');
}

export function isJSXSource(fileName: string) {
  return !!fileName && fileName.endsWith('.jsx');
}

export function getProjectBabelConfig(projectRoot?: string) {
  const babelConfig = loadOptions({ cwd: projectRoot, root: projectRoot });
  return babelConfig ?? {};
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

export function isParallelModeAvailable(loaderContext: LoaderContext) {
  if (isWebpackBackend(loaderContext)) {
    return false;
  }
  return !!loaderContext._compiler.options.experiments?.parallelLoader;
}

export function getProjectRootPath(
  loaderContext: LoaderContext
): string | undefined {
  // parallel loaders in Rspack had a bug where rootContext
  // was the same as context, so we check if they are different
  if (loaderContext.rootContext !== loaderContext.context) {
    return loaderContext.rootContext;
  }
  return undefined;
}

function safelyResolve(path: string, from: string): string | null {
  try {
    return require.resolve(path, { paths: [from] });
  } catch {
    return null;
  }
}

async function getSwcModule(loaderContext: LoaderContext): Promise<Swc | null> {
  const projectRoot = getProjectRootPath(loaderContext) ?? process.cwd();
  const isWebpack = isWebpackBackend(loaderContext);
  if (!isWebpack) {
    // happy path - rspack & exposed swc
    if (loaderContext._compiler.rspack.experiments.swc) {
      console.log('using exposed swc from `@rspack/core`');
      return loaderContext._compiler.rspack.experiments.swc;
    }
    // fallback to checking for `@rspack/core` installed in the project
    const rspackCorePath = safelyResolve('@rspack/core', projectRoot);
    if (rspackCorePath && !isWebpack) {
      const rspack = await import(rspackCorePath);
      if (rspack) console.log('using swc from `@rspack/core`');
      if ('default' in rspack) return rspack.default.experiments.swc;
      if (rspack) return rspack.experiments.swc;
    }
  }
  // fallback to checking for `@swc/core` installed in the project
  // this can be in both webpack & rspack projects
  const swcCorePath = safelyResolve('@swc/core', projectRoot);
  if (swcCorePath) {
    const swc = await import(swcCorePath);
    if (swc) console.log('using swc from`@swc/core`');
    if ('default' in swc) return swc.default as Swc;
    if (swc) return swc as Swc;
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
