import os from 'node:os';
import {
  ASSETS_DEST_ENV_KEY,
  BUNDLE_FILENAME_ENV_KEY,
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

const cores = os.availableParallelism();

function getMaxWorkers() {
  return Math.max(
    1,
    Math.ceil(cores * (0.5 + 0.5 * Math.exp(-cores * 0.07)) - 1)
  ).toString();
}

export function setupEnvironment(args: EnvironmentArgs): void {
  const maxWorkers = getMaxWorkers();
  console.log('cpu cores / workers', cores, maxWorkers);
  setEnvVar(VERBOSE_ENV_KEY, args.verbose ? 'true' : undefined);
  setEnvVar(BUNDLE_FILENAME_ENV_KEY, args.bundleOutput);
  setEnvVar(SOURCEMAP_FILENAME_ENV_KEY, args.sourcemapOutput);
  setEnvVar(ASSETS_DEST_ENV_KEY, args.assetsDest);
  // TODO: move to a more appropriate place
  setEnvVar('TOKIO_WORKER_THREADS', maxWorkers);
  setEnvVar('RAYON_NUM_THREADS', maxWorkers);
}
