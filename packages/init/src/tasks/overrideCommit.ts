import { execa } from 'execa';

const overrideCommit = async (rootDir: string) => {
  try {
    await execa('git', ['--version']);

    // Amend the existing commit without changing the message, RNC CLI creates a new commit with a message "Initial commit" already.
    await execa('git', ['commit', '--amend', '--no-edit'], {
      cwd: rootDir,
    });
  } catch {
    // If git command fails (not installed or not a git repo), silently return
    return;
  }
};

export default overrideCommit;
