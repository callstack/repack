import fs from 'node:fs';
import path from 'node:path';
import packageJson from '../../package.json' with { type: 'json' };
import versionsJson from '../../versions.json' with { type: 'json' };
import { RepackInitError } from '../utils/error.js';
import logger from '../utils/logger.js';

function getOwnCurrentVersion() {
  return '^' + packageJson.version;
}

function getBundlerSpecificDependencies(bundler: 'rspack' | 'webpack') {
  return versionsJson[bundler];
}

/**
 * Installs dependencies required by Re.Pack using the specified package manager
 *
 * @param bundler rspack or webpack
 * @param projectRootDir root directory of the project
 * @param repackVersion optional custom version of Re.Pack to install
 */
export default async function modifyDependencies(
  bundler: 'rspack' | 'webpack',
  projectRootDir: string,
  repackVersion?: string
) {
  let _repackVersion: string;

  if (repackVersion) {
    _repackVersion = repackVersion;
    logger.info(`Using custom Re.Pack version ${_repackVersion}`);
  } else {
    _repackVersion = getOwnCurrentVersion();
    logger.info(`Using default Re.Pack version ${_repackVersion}`);
  }

  const packageJsonPath = path.join(projectRootDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  try {
    // Merge existing and new dependencies
    const mergedDependencies = {
      ...packageJson.devDependencies,
      ...getBundlerSpecificDependencies(bundler),
      '@callstack/repack': _repackVersion,
    };

    // Sort dependencies alphabetically
    packageJson.devDependencies = Object.fromEntries(
      Object.entries(mergedDependencies).sort(([a], [b]) => a.localeCompare(b))
    );

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  } catch {
    throw new RepackInitError('Failed to modify project dependencies.');
  }
}
