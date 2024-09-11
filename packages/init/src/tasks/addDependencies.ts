import type { PM } from 'detect-package-manager';
import { execa } from 'execa';
import ora from 'ora';
import packageJson from '../../package.json';
import logger from '../utils/logger.js';

const packageVersion = packageJson.version;

const rspackDependencies = [
  '@rspack/core',
  '@rspack/plugin-react-refresh',
  '@swc/helpers',
  '@callstack/repack',
];

const webpackDependencies = [
  'webpack',
  'terser-webpack-plugin',
  'babel-loader',
  '@rspack/plugin-react-refresh',
  '@callstack/repack',
];

/**
 * Installs dependencies required by Re.Pack using the specified package manager
 *
 * @param packageManager yarn, npm or pnpm
 */
export default async function addDependencies(
  bundler: 'rspack' | 'webpack',
  packageManager: PM,
  repackVersion: string = packageVersion
) {
  const dependencies =
    bundler === 'rspack' ? rspackDependencies : webpackDependencies;

  let installCommand: string;

  if (packageManager === 'yarn' || packageManager === 'bun') {
    installCommand = 'add';
  } else {
    installCommand = 'install';
  }

  const index = dependencies.indexOf('@callstack/repack');
  dependencies[index] = `@callstack/repack@${repackVersion}`;
  logger.info(`Using custom Re.Pack version ${repackVersion}`);

  const deps = dependencies.join(' ');
  const command = `${packageManager} ${installCommand} -D ${deps}`;

  let spinner;

  try {
    spinner = ora(
      `Installing Re.Pack dependencies using ${packageManager}`
    ).start();
    await execa(command, { stdio: 'pipe', shell: true });
    spinner.succeed('Dependencies installed');
  } catch (error) {
    spinner?.fail(`Failed to install Re.Pack dependencies`);
    throw error;
  }
}
