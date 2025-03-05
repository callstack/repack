import { execa } from 'execa';
import logger from '../utils/logger.js';

const isGitRepo = async (dir: string) => {
  try {
    await execa('git', ['rev-parse', '--is-inside-work-tree'], {
      stdio: 'ignore',
      cwd: dir,
    });
    return true;
  } catch {
    return false;
  }
};

export default async function setupGit(rootDir: string) {
  try {
    const isRepo = await isGitRepo(rootDir);
    if (isRepo) {
      logger.info('Already a git repo, skipping...');
      return;
    }

    // Amend the commit
    await execa('git', ['init'], { cwd: rootDir });
    await execa('git', ['add', '.'], { cwd: rootDir });
    await execa('git', ['commit', '-m', 'Initial commit'], { cwd: rootDir });
  } catch (e) {
    logger.info('Failed to setup git, skipping...');
    logger.info(e instanceof Error ? e.message : String(e));
    // Silently return if any git command fails
    return;
  }
}
