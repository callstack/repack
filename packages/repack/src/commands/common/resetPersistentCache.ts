import fs from 'node:fs';
import path from 'node:path';
import type { Configuration as RspackConfiguration } from '@rspack/core';
import * as colorette from 'colorette';
import type { Configuration as WebpackConfiguration } from 'webpack';

// Rspack 2 moved the persistent cache configuration from `experiments.cache`
// to the top-level `cache` option (same shape). The v2 types no longer
// declare the legacy location, so extend them with it to support configs
// written for either major.
type RspackCacheOptions = RspackConfiguration['cache'];
type RspackExperimentsWithLegacyCache = NonNullable<
  RspackConfiguration['experiments']
> & { cache?: RspackCacheOptions };

export interface RspackConfigurationWithLegacyCache {
  cache?: RspackCacheOptions;
  experiments?: RspackExperimentsWithLegacyCache;
}

type WebpackCacheOptions = WebpackConfiguration['cache'];

/**
 * Collects the persistent cache configurations from a Rspack config,
 * covering both the Rspack 1 (`experiments.cache`) and
 * Rspack 2 (top-level `cache`) locations. A merged or dual-major config
 * can carry both keys and which one is active depends on the installed
 * Rspack major, so `--reset-cache` clears both locations.
 */
export function getRspackCacheConfigs(
  config: RspackConfigurationWithLegacyCache
): RspackCacheOptions[] {
  const cacheConfigs = [config.experiments?.cache, config.cache].filter(
    (cacheConfig) => cacheConfig !== undefined
  );
  // without an explicit cache config, the default cache location still applies
  return cacheConfigs.length > 0 ? cacheConfigs : [undefined];
}

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

function getRspackCachePaths(
  rootDir: string,
  cacheConfigs: RspackCacheOptions[]
): Set<string> {
  const cachePaths = new Set<string>();

  for (const cacheConfig of cacheConfigs) {
    if (
      typeof cacheConfig === 'object' &&
      cacheConfig !== null &&
      'storage' in cacheConfig &&
      cacheConfig.storage?.directory
    ) {
      const candidateDir = cacheConfig.storage.directory;
      cachePaths.add(getCustomCacheDirectory(candidateDir, rootDir));
    } else {
      cachePaths.add(getDefaultCacheDirectory('rspack', rootDir));
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
      cachePaths.add(getDefaultCacheDirectory('webpack', rootDir));
    }
  }

  return cachePaths;
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
