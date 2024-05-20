import path from 'node:path';
import { execa } from 'execa';
import { findRoot } from '@manypkg/find-root';
import { input } from '@inquirer/prompts';
import logger from '../utils/logger.js';

/**
 * Ensures that the project exists and prompts the user to create one if it doesn't
 *
 * @param cwd current working directory
 * @returns project root directory and cwd
 */
export default async function ensureProjectExists(): Promise<{
  cwd: string;
  rootDir: string;
}> {
  const cwd = process.cwd();

  try {
    const { rootDir } = await findRoot(cwd);
    return { cwd, rootDir };
  } catch {
    logger.info('No project found, prompting user to create a new one.');
  }

  let projectName: string;

  try {
    const shouldCreateNewProject = await input({
      default: 'y',
      message: 'Would you like to create a new project? [y/n]',
      validate: (value) => value === 'y' || value === 'n',
    });

    if (shouldCreateNewProject !== 'y') {
      throw new Error('Cancelled by user');
    }

    projectName = await input({
      message: 'How would you like to name the app?',
      validate: (value) => !!value,
    });
  } catch (error) {
    logger.warn('Re.Pack setup cancelled by user');
    logger.info(`Reason: ${error}`);
    process.exit(0);
  }

  logger.success(`Creating a new project using '@react-native-community/cli':`);

  try {
    await execa(`npx react-native init ${projectName} --skip-install`, {
      stdio: 'inherit', // make sure user can interact with CLI prompts
      shell: true,
    });
  } catch {
    // CLI will print the detailed error message
    throw new Error(
      "Failed to create a new project using '@react-native-community/cli'"
    );
  }

  const projectDir = path.join(cwd, projectName);
  return { cwd: projectDir, rootDir: projectDir };
}
