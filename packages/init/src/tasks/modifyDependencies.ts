import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';
import logger from '../utils/logger.js';

const rspackDependencies = ['@rspack/core', '@swc/helpers'];
const webpackDependencies = ['webpack', 'terser-webpack-plugin'];

function getOwnCurrentVersion() {
  const dirname = fileURLToPath(import.meta.url);
  const packageJsonPath = path.join(dirname, '../../../package.json');

  const packageJson = fs.readFileSync(packageJsonPath, 'utf-8');
  const { version } = JSON.parse(packageJson) as { version: string };

  return '~' + version;
}

async function getLatestVersion(dependency: string) {
  try {
    const { stdout } = await execa('npm', ['view', dependency, 'version']);
    const version = stdout.trim();
    logger.info(`Latest version for ${dependency} is ${version}`);
    return version;
  } catch {
    logger.error(`Failed to fetch latest version for ${dependency}`);
    return 'latest';
  }
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
  const devDependencies =
    bundler === 'rspack' ? rspackDependencies : webpackDependencies;

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
    const entries = await Promise.all(
      devDependencies.map(async (packageName) => {
        const latestVersion = await getLatestVersion(packageName);
        return [packageName, `~${latestVersion}`];
      })
    );

    // Add @callstack/repack to the list of dependencies
    entries.push(['@callstack/repack', _repackVersion]);

    const newDevDependencies = Object.fromEntries(entries);

    // Merge existing and new dependencies
    const mergedDependencies = {
      ...packageJson.devDependencies,
      ...newDevDependencies,
    };

    // Sort dependencies alphabetically
    packageJson.devDependencies = Object.fromEntries(
      Object.entries(mergedDependencies).sort(([a], [b]) => a.localeCompare(b))
    );

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  } catch (error) {
    logger.error('Failed to modify project dependencies.');
    throw error;
  }
}
