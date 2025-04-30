import fs from 'node:fs';
import path from 'node:path';
import type { Configuration as RspackConfiguration } from '@rspack/core';
import type { Configuration as WebpackConfiguration } from 'webpack';

type RspackCacheOptions = NonNullable<
  RspackConfiguration['experiments']
>['cache'];
type WebpackCacheOptions = WebpackConfiguration['cache'];

function getDefaultCacheDirectory(bundler: 'rspack' | 'webpack') {
  return path.join('node_modules', '.cache', bundler);
}

function getCustomCacheDirectory(candidate: string, rootDir: string): string {
  if (path.isAbsolute(candidate)) return candidate;
  return path.resolve(rootDir, candidate);
}

function getRspackCachePaths(
  rootDir: string,
  cacheConfigs: RspackCacheOptions[]
): Set<string> {
  const cachePaths = new Set<string>();

  for (const cacheConfig of cacheConfigs) {
    if (
      typeof cacheConfig === 'object' &&
      'storage' in cacheConfig &&
      cacheConfig.storage?.directory
    ) {
      const candidateDir = cacheConfig.storage.directory;
      cachePaths.add(getCustomCacheDirectory(candidateDir, rootDir));
    } else {
      cachePaths.add(getDefaultCacheDirectory('rspack'));
    }
  }

  return cachePaths;
}

function getWebpackCachePaths(
  rootDir: string,
  cacheConfigs: WebpackCacheOptions[]
): Set<string> {
  const cachePaths = new Set<string>();

  for (const cacheConfig of cacheConfigs) {
    if (
      typeof cacheConfig === 'object' &&
      'cacheLocation' in cacheConfig &&
      cacheConfig.cacheLocation
    ) {
      const candidateDir = path.dirname(cacheConfig.cacheLocation);
      cachePaths.add(getCustomCacheDirectory(candidateDir, rootDir));
    } else if (
      typeof cacheConfig === 'object' &&
      'cacheDirectory' in cacheConfig &&
      cacheConfig.cacheDirectory
    ) {
      const candidateDir = cacheConfig.cacheDirectory;
      cachePaths.add(getCustomCacheDirectory(candidateDir, rootDir));
    } else {
      cachePaths.add(getDefaultCacheDirectory('rspack'));
    }
  }

  return cachePaths;
}

function deleteCacheDirectory(cachePath: string): void {
  if (!fs.existsSync(cachePath)) return;

  try {
    fs.rmSync(cachePath, { recursive: true });
  } catch (error) {
    console.warn(`Failed to delete cache at ${cachePath}:`, error);
  }
}

export function resetPersistentCache(config: {
  bundler: 'rspack';
  rootDir: string;
  cacheConfigs: RspackCacheOptions[];
}): void;

export function resetPersistentCache(config: {
  bundler: 'webpack';
  rootDir: string;
  cacheConfigs: WebpackCacheOptions[];
}): void;

export function resetPersistentCache({
  bundler,
  rootDir,
  cacheConfigs,
}: {
  bundler: 'rspack' | 'webpack';
  rootDir: string;
  cacheConfigs: unknown;
}) {
  const cachePaths =
    bundler === 'rspack'
      ? getRspackCachePaths(rootDir, cacheConfigs as RspackCacheOptions[])
      : getWebpackCachePaths(rootDir, cacheConfigs as WebpackCacheOptions[]);

  cachePaths.forEach(deleteCacheDirectory);
}
