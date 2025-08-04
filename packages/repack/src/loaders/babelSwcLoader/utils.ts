import { loadOptions } from '@babel/core';
import type {
  Compiler as RspackCompiler,
  SwcLoaderParserConfig,
} from '@rspack/core';
import type { Compiler as WebpackCompiler } from 'webpack';
import { isRspackCompiler } from '../../utils/internal/index.js';

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

export function isWebpackCompiler(compiler: RspackCompiler | WebpackCompiler) {
  // context: parallel loader in Rspack has mocked compiler object without most props
  // but in non-parallel mode, full compiler object is available so we can do the proper check
  // we distinguish between parallel and non-parallel mode by checking if the compiler has a version property
  // and then proceed to check if it's a Rspack compiler
  return compiler.webpack.version && !isRspackCompiler(compiler);
}

export function isParallelModeAvailable(
  compiler: RspackCompiler | WebpackCompiler
) {
  // only available with Rspack
  if (!isRspackCompiler(compiler)) {
    return false;
  }

  return !!(compiler as RspackCompiler).options.experiments?.parallelLoader;
}
