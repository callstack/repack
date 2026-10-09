import fs from 'node:fs';
import path from 'node:path';
import type { Configuration as RspackConfiguration } from '@rspack/core';
import * as colorette from 'colorette';
import type { Configuration as WebpackConfiguration } from 'webpack';

type CacheOptions =
  | RspackConfiguration['cache']
  | WebpackConfiguration['cache'];

function getDefaultCacheDirectory(
  bundler: 'rspack' | 'webpack',
  rootDir: string
) {
  const defaultCacheDir = path.join('node_modules', '.cache', bundler);
  return path.join(rootDir, defaultCacheDir);
}

function getCustomCacheDirectory(candidate: string, rootDir: string): string {
  if (path.isAbsolute(candidate)) return candidate;
  return path.resolve(rootDir, candidate);
}

function getCachePath(
  bundler: 'rspack' | 'webpack',
  rootDir: string,
  cacheConfig: CacheOptions
): string {
  if (typeof cacheConfig === 'object') {
    // Rspack `type: 'persistent'`
    if ('storage' in cacheConfig && cacheConfig.storage?.directory) {
      return getCustomCacheDirectory(cacheConfig.storage.directory, rootDir);
    }
    // `type: 'filesystem'` (webpack, Rspack with `experiments.newCache`)
    if ('cacheLocation' in cacheConfig && cacheConfig.cacheLocation) {
      const candidateDir = path.dirname(cacheConfig.cacheLocation);
      return getCustomCacheDirectory(candidateDir, rootDir);
    }
    if ('cacheDirectory' in cacheConfig && cacheConfig.cacheDirectory) {
      return getCustomCacheDirectory(cacheConfig.cacheDirectory, rootDir);
    }
  }
  return getDefaultCacheDirectory(bundler, rootDir);
}

export function resetPersistentCache({
  bundler,
  rootDir,
  cacheConfigs,
}: {
  bundler: 'rspack' | 'webpack';
  rootDir: string;
  cacheConfigs: CacheOptions[];
}) {
  const cachePaths = new Set(
    cacheConfigs.map((cacheConfig) =>
      getCachePath(bundler, rootDir, cacheConfig)
    )
  );

  const warn = (msg: string) => console.warn(colorette.yellow(msg));

  for (const cachePath of cachePaths) {
    if (!fs.existsSync(cachePath)) continue;
    const relativeCachePath = path.relative(rootDir, cachePath);

    if (relativeCachePath.startsWith('..')) {
      warn(
        `Cache path "${relativeCachePath}" is outside of the project directory. ` +
          'Resetting cache outside of the project directory is not supported. ' +
          'Please delete the cache directory manually.\n'
      );
      continue;
    }

    try {
      fs.rmSync(cachePath, { recursive: true });
      warn(`Deleted transformation cache at ${relativeCachePath}\n`);
    } catch {
      warn(`Failed to delete cache at ${relativeCachePath}\n`);
    }
  }
}
