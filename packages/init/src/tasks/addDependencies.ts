import { execa } from 'execa';
import ora from 'ora';

import logger from '../utils/logger.js';

const dependencies = [
  'webpack',
  'terser-webpack-plugin',
  'babel-loader',
  '@callstack/repack',
];

/**
 * Installs dependencies required by Re.Pack using the specified package manager
 *
 * @param packageManager yarn or npm
 */
export default async function addDependencies(packageManager: 'yarn' | 'npm') {
  let installCommand: string;

  if (packageManager === 'yarn') {
    installCommand = 'add';
  } else {
    installCommand = 'install';
  }
  const deps = dependencies.join(' ');
  const command = `${packageManager} ${installCommand} -D ${deps}`;

  let spinner;

  try {
    spinner = ora(
      ` Installing Re.Pack dependencies using ${packageManager}`
    ).start();
    await execa(command, { stdio: 'pipe', shell: true });
    spinner.stop();
    logger.success('Dependencies installed');
  } catch (error) {
    spinner?.stop();
    logger.error(`Failed to install Re.Pack dependencies`);
    throw error;
  }
}
