import fs from 'node:fs';
import type { Compiler } from '@rspack/core';
import {
  createExpoPublicEnvironmentSnapshot,
  type ExpoEnvironmentMode,
  type ExpoPublicEnvironmentSnapshot,
  getExpoEnvironmentFiles,
} from './expoPublicEnvironment.js';

const PLUGIN_NAME = 'RepackExpoPublicEnvironmentPlugin';

function addEnvironmentDigestToPersistentCache(
  compiler: Compiler,
  digest: string
): void {
  const cache = compiler.options.cache || compiler.options.experiments?.cache;
  if (typeof cache !== 'object' || cache.type !== 'persistent') return;

  cache.version = [cache.version, `${PLUGIN_NAME}:${digest}`]
    .filter(Boolean)
    .join('|');
}

export function configureExpoPublicEnvironment(
  compiler: Compiler,
  projectRoot: string
): ExpoPublicEnvironmentSnapshot {
  const mode: ExpoEnvironmentMode =
    compiler.options.mode === 'development' ? 'development' : 'production';
  const environment = createExpoPublicEnvironmentSnapshot({
    mode,
    projectRoot,
  });
  const environmentFiles = getExpoEnvironmentFiles(projectRoot, mode);
  addEnvironmentDigestToPersistentCache(compiler, environment.digest);
  const refreshEnvironment = () => {
    Object.assign(
      environment,
      createExpoPublicEnvironmentSnapshot({ mode, projectRoot })
    );
  };

  compiler.hooks?.beforeCompile?.tap(PLUGIN_NAME, refreshEnvironment);
  compiler.hooks?.thisCompilation?.tap(PLUGIN_NAME, (compilation) => {
    for (const filename of environmentFiles) {
      if (fs.existsSync(filename)) compilation.fileDependencies.add(filename);
      else compilation.missingDependencies.add(filename);
    }
  });
  return environment;
}
