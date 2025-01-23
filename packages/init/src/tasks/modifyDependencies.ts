import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';
import logger from '../utils/logger.js';

const rspackDependencies = [
  '\\@rspack/core',
  '\\@swc/helpers',
  '\\@callstack/repack',
];

const webpackDependencies = [
  'webpack',
  'terser-webpack-plugin',
  '\\@callstack/repack',
];

function getCurrentVersion() {
  const dirname = fileURLToPath(import.meta.url);
  const packageJsonPath = path.join(dirname, '../../../package.json');

  const packageJson = fs.readFileSync(packageJsonPath, 'utf-8');
  const { version } = JSON.parse(packageJson) as { version: string };

  return version;
}

async function getLatestVersion(dependency: string) {
  try {
    const { stdout } = await execa('npm', ['view', dependency, 'version']);
    return stdout.trim();
  } catch (error) {
    logger.warn(
      `Failed to fetch latest version for ${dependency}: ${error instanceof Error ? error.message : String(error)}`
    );
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

  let version: string;

  if (repackVersion) {
    version = repackVersion;
    logger.info(`Using custom Re.Pack version ${version}`);
  } else {
    version = getCurrentVersion();
    logger.info(`Using default Re.Pack version ${version}`);
  }

  const index = devDependencies.indexOf('@callstack/repack');
  devDependencies[index] = `@callstack/repack@${version}`;

  const packageJsonPath = path.join(projectRootDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  try {
    // Convert dependencies array to object with versions
    const dependencyEntries = await Promise.all(
      devDependencies.map(async (dep) => {
        const [name, specifiedVersion] = dep.split('@').filter(Boolean);
        const packageName = `@callstack/${name}` === name ? dep : name;

        // Skip version check for repack as we handle it separately
        if (packageName === '@callstack/repack') {
          return [packageName, version];
        }

        const latestVersion =
          specifiedVersion || (await getLatestVersion(packageName));
        return [packageName, `^${latestVersion}`];
      })
    );

    const newDependencies = Object.fromEntries(dependencyEntries);

    // Merge existing and new dependencies
    const mergedDependencies = {
      ...packageJson.devDependencies,
      ...newDependencies,
    };

    // Sort dependencies alphabetically
    packageJson.devDependencies = Object.fromEntries(
      Object.entries(mergedDependencies).sort(([a], [b]) => a.localeCompare(b))
    );

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  } catch (error) {
    logger.error(
      `Failed to fetch latest versions for some dependencies: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
}
