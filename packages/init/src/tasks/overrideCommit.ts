import { execa } from "execa";

export default async function overrideCommit(rootDir: string) {
  try {
    // Amend the existing commit without changing the message, RNC CLI creates
    // new commit with a message "Initial commit" already.
    await execa("git", ["commit", "--amend", "--no-edit"], {
      cwd: rootDir,
    });
  } catch {
    // If git command fails (not installed or not a git repo), silently return
    return;
  }
};

