import path from 'node:path';

const projectRootPattern = /^\[projectRoot(?:\^(\d+))?\]$/;

function isProjectPath(filepath: string) {
  const root = filepath.split('/')[0];
  return root.match(projectRootPattern);
}

// Resolve [projectRoot] and [projectRoot^N] prefixes
export function resolveProjectPath(filepath: string, rootDir: string) {
  // Bundlers percent-encode `^` in source map paths, so parent-escape tokens
  // arrive as `[projectRoot%5E2]/...`. Decode only the token, not the whole
  // path — file names may contain literal percent sequences.
  const normalizedPath = filepath.replace(
    /^\[projectRoot%5E(\d+)\]/i,
    '[projectRoot^$1]'
  );

  const match = isProjectPath(normalizedPath);
  if (!match) return filepath;

  const [prefix, upLevels] = match;
  const upPath = '../'.repeat(Number(upLevels ?? 0));
  const rootPath = path.join(rootDir, upPath);
  return path.resolve(normalizedPath.replace(prefix, rootPath));
}
