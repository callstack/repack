import path from 'node:path';

const projectRootPattern = /^\[projectRoot(?:\^(\d+))?\]$/;

function isProjectPath(filepath: string) {
  const root = filepath.split('/')[0];
  return root.match(projectRootPattern);
}

// Resolve [projectRoot] and [projectRoot^N] prefixes
export function resolveProjectPath(filepath: string, rootDir: string) {
  const match = isProjectPath(filepath);
  if (!match) return filepath;

  const [prefix, upLevels] = match;
  const upPath = '../'.repeat(Number(upLevels ?? 0));
  const rootPath = path.join(rootDir, upPath);
  return path.resolve(filepath.replace(prefix, rootPath));
}
