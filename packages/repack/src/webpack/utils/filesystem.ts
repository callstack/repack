import fs from 'node:fs';

export async function ensureDir(path: string): Promise<boolean> {
  try {
    await fs.promises.mkdir(path, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await fs.promises.access(path);
    return true;
  } catch {
    return false;
  }
}
