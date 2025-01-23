import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RepackInitError } from '../utils/error.js';
import logger from '../utils/logger.js';

interface VersionsJSON {
  rspack: Record<string, string>;
  webpack: Record<string, string>;
}

const dirname = fileURLToPath(import.meta.url);

function getOwnCurrentVersion() {
  const packageJsonPath = path.join(dirname, '../../../package.json');

  const packageJson = fs.readFileSync(packageJsonPath, 'utf-8');
  const { version } = JSON.parse(packageJson) as { version: string };

  return '~' + version;
}

function getBundlerSpecificDependencies(bundler: 'rspack' | 'webpack') {
  const versionsJsonPath = path.join(dirname, '../../../versions.json');

  const versionsJson = fs.readFileSync(versionsJsonPath, 'utf-8');
  const versions = JSON.parse(versionsJson) as VersionsJSON;

  return versions[bundler];
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
