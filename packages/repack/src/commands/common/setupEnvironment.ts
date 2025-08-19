import {
  ASSETS_DEST_ENV_KEY,
  BUNDLE_FILENAME_ENV_KEY,
  RSPACK_RAYON_THREADS_ENV_KEY,
  RSPACK_TOKIO_THREADS_ENV_KEY,
  SOURCEMAP_FILENAME_ENV_KEY,
  VERBOSE_ENV_KEY,
} from '../../env.js';

function setEnvVar(key: string, value: string | undefined): void {
  if (process.env[key] === undefined && value !== undefined) {
    process.env[key] = value;
  }
}

interface EnvironmentArgs {
  assetsDest?: string;
  bundleOutput?: string;
  sourcemapOutput?: string;
  verbose?: boolean;
}

export function setupEnvironment(args: EnvironmentArgs): void {
  setEnvVar(VERBOSE_ENV_KEY, args.verbose ? 'true' : undefined);
  setEnvVar(BUNDLE_FILENAME_ENV_KEY, args.bundleOutput);
  setEnvVar(SOURCEMAP_FILENAME_ENV_KEY, args.sourcemapOutput);
  setEnvVar(ASSETS_DEST_ENV_KEY, args.assetsDest);
}

export function setupRspackEnvironment(maxWorkers: string): void {
  setEnvVar(RSPACK_TOKIO_THREADS_ENV_KEY, maxWorkers);
  setEnvVar(RSPACK_RAYON_THREADS_ENV_KEY, maxWorkers);
}
