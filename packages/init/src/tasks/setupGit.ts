import { execa } from 'execa';

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
      return;
    }

    // Amend the commit
    await execa('git', ['init'], { cwd: rootDir });
    await execa('git', ['add', '.'], { cwd: rootDir });
    await execa('git', ['commit', '-m', 'Initial commit'], { cwd: rootDir });
  } catch (e) {
    // Silently return if any git command fails
    return;
  }
}
