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
  bundleFilename?: string;
  sourcemapFilename?: string;
  verbose?: boolean;
}

export function setupEnvironment(args: EnvironmentArgs): void {
  setEnvVar(VERBOSE_ENV_KEY, args.verbose ? 'true' : undefined);
  setEnvVar(BUNDLE_FILENAME_ENV_KEY, args.bundleFilename);
  setEnvVar(SOURCEMAP_FILENAME_ENV_KEY, args.sourcemapFilename);
  setEnvVar(ASSETS_DEST_ENV_KEY, args.assetsDest);
}
