import fs from 'node:fs';
import repackBabelLoader, { raw } from '@callstack/repack/babel-loader';
import type { LoaderContext } from '@rspack/core';
import {
  type ExpoEnvironmentMode,
  type ExpoPublicEnvironmentSnapshot,
  getExpoEnvironmentFiles,
} from '../environment/expoPublicEnvironment.js';
import { withExpoBabelCaller } from './withExpoBabelCaller.js';

export { raw };

type ExpoLoaderCaller = {
  isDev?: boolean;
  isNodeModule?: boolean;
  projectRoot?: string;
};

function withExpoPublicEnvironment(
  loader: LoaderContext<Record<string, unknown>>,
  options: Record<string, unknown>,
  publicEnvironment: ExpoPublicEnvironmentSnapshot | undefined
): Record<string, unknown> {
  const caller = options.caller as ExpoLoaderCaller | undefined;
  if (
    !caller?.projectRoot ||
    caller.isNodeModule ||
    !publicEnvironment?.inline
  ) {
    return options;
  }

  const mode: ExpoEnvironmentMode = caller.isDev ? 'development' : 'production';
  for (const filename of getExpoEnvironmentFiles(caller.projectRoot, mode)) {
    if (fs.existsSync(filename)) loader.addDependency(filename);
    else if (loader.addMissingDependency) loader.addMissingDependency(filename);
    else loader.addDependency(filename);
  }

  const environmentPlugin = [
    require.resolve('../babel/inlineExpoPublicEnvironment.js'),
    {
      environment: publicEnvironment.values,
    },
  ];

  return {
    ...options,
    plugins: [
      ...(Array.isArray(options.plugins) ? options.plugins : []),
      environmentPlugin,
    ],
  };
}

export default function expoBabelLoader(
  this: LoaderContext<Record<string, unknown>>,
  source: string,
  sourceMap: string | undefined
) {
  const originalGetOptions = this.getOptions;
  const { expoPublicEnvironment, ...babelLoaderOptions } =
    originalGetOptions.call(this) as Record<string, unknown> & {
      expoPublicEnvironment?: ExpoPublicEnvironmentSnapshot;
    };
  const options = withExpoPublicEnvironment(
    this,
    withExpoBabelCaller(
      { sourceRoot: undefined, ...babelLoaderOptions },
      this.resourcePath
    ),
    expoPublicEnvironment
  );

  this.getOptions = () => options;
  try {
    return repackBabelLoader.call(this, source, sourceMap);
  } finally {
    this.getOptions = originalGetOptions;
  }
}
