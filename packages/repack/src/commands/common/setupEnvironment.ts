import {
  ASSETS_DEST_ENV_KEY,
  BUNDLE_FILENAME_ENV_KEY,
  SOURCEMAP_FILENAME_ENV_KEY,
  VERBOSE_ENV_KEY,
} from '../../env.js';

interface EnvironmentArgs {
  assetsDest?: string;
  bundleFilename?: string;
  sourcemapFilename?: string;
  verbose?: boolean;
}

export function setupEnvironment(args: EnvironmentArgs) {
  if (args.verbose) {
    process.env[VERBOSE_ENV_KEY] = 'true';
  }

  if (args.bundleFilename) {
    process.env[BUNDLE_FILENAME_ENV_KEY] = args.bundleFilename;
  }

  if (args.sourcemapFilename) {
    process.env[SOURCEMAP_FILENAME_ENV_KEY] = args.sourcemapFilename;
  }

  if (args.assetsDest) {
    process.env[ASSETS_DEST_ENV_KEY] = args.assetsDest;
  }
}
