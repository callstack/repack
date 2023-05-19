import type { PM } from 'detect-package-manager';
import { execa } from 'execa';
import ora from 'ora';

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
export default async function addDependencies(packageManager: PM) {
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
      `Installing Re.Pack dependencies using ${packageManager}`
    ).start();
    await execa(command, { stdio: 'pipe', shell: true });
    spinner.succeed('Dependencies installed');
  } catch (error) {
    spinner?.fail(`Failed to install Re.Pack dependencies`);
    throw error;
  }
}
