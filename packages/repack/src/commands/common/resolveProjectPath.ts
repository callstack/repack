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
  const upSegments = Array.from({ length: Number(upLevels ?? 0) }, () => '..');
  const restSegments = filepath
    .slice(prefix.length + 1)
    .split('/')
    .filter(Boolean);
  // resolve segment-by-segment instead of string-replace + join composition:
  // on Windows, joining enough `../` segments to reach the filesystem root
  // yields a bare root ending in a separator, and concatenating the rest of
  // the path after it produced a double-separator (UNC-like `\\...`) prefix
  return path.resolve(rootDir, ...upSegments, ...restSegments);
}
