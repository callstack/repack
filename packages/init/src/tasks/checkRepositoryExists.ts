import { findRoot } from '@manypkg/find-root';
import logger from '../utils/logger.js';

/**
 * Checks if the repository exists
 *
 * @param cwd current working directory
 * @returns repository root directory if it exists, undefined otherwise
 */
export default async function checkRepositoryExists(
  cwd: string
): Promise<string | undefined> {
  try {
    const { rootDir } = await findRoot(cwd);
    logger.info(`Found root of the repository at ${rootDir}`);
    return rootDir;
  } catch {
    logger.info('No repository found');
  }
}
