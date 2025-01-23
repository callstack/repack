import { findRoot } from '@manypkg/find-root';
import logger from '../utils/logger.js';

/**
 * Checks if the project exists
 *
 * @param cwd current working directory
 * @returns projectRootDir if it exists, undefined otherwise
 */
export default async function checkProjectExists(cwd: string): Promise<{
  projectRootDir: string | undefined;
}> {
  try {
    const { rootDir } = await findRoot(cwd);
    logger.info(`Found root of the project at ${rootDir}`);
    return { projectRootDir: rootDir };
  } catch {
    logger.info('No existing React Native project found');
  }

  return { projectRootDir: undefined };
}
