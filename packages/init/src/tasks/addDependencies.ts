import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PM } from 'detect-package-manager';
import { execa } from 'execa';
import ora, { type Ora } from 'ora';
import logger from '../utils/logger.js';

const rspackDependencies = [
  '@rspack/core',
  '@swc/helpers',
  '@callstack/repack',
];

const webpackDependencies = [
  'webpack',
  'terser-webpack-plugin',
  '@callstack/repack',
];

function getCurrentVersion() {
  const dirname = fileURLToPath(import.meta.url);
  const packageJsonPath = path.join(dirname, '../../../package.json');

  const packageJson = fs.readFileSync(packageJsonPath, 'utf-8');
  const { version } = JSON.parse(packageJson) as { version: string };

  return version;
}

/**
 * Installs dependencies required by Re.Pack using the specified package manager
 *
 * @param bundler rspack or webpack
 * @param cwd current working directory
 * @param packageManager yarn, npm or pnpm
 * @param repackVersion optional custom version of Re.Pack to install
 */
export default async function addDependencies(
  bundler: 'rspack' | 'webpack',
  cwd: string,
  packageManager: PM,
  repackVersion?: string
) {
  const dependencies =
    bundler === 'rspack' ? rspackDependencies : webpackDependencies;

  let installCommand: string;

  if (packageManager === 'yarn' || packageManager === 'bun') {
    installCommand = 'add';
  } else {
    installCommand = 'install';
  }

  let version: string;

  if (repackVersion) {
    version = repackVersion;
    logger.info(`Using custom Re.Pack version ${version}`);
  } else {
    version = getCurrentVersion();
    logger.info(`Using default Re.Pack version ${version}`);
  }

  const index = dependencies.indexOf('@callstack/repack');
  dependencies[index] = `@callstack/repack@${version}`;

  const deps = dependencies.join(' ');
  const command = `${packageManager} ${installCommand} -D ${deps}`;

  let spinner: Ora | undefined;

  try {
    spinner = ora(
      `Installing Re.Pack dependencies using ${packageManager}`
    ).start();
    await execa(command, { cwd, stdio: 'pipe', shell: true });
    spinner.succeed('Dependencies installed');
  } catch (error) {
    spinner?.fail('Failed to install Re.Pack dependencies');
    throw error;
  }
}
