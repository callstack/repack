import path from 'node:path';

export function parseSourceFilename(filename: string, rootDir: string) {
  const prefix = filename.split('/')[0];
  let filepath = filename;

  // Handle [projectRoot] and [projectRoot^N] prefixes
  const projectRootMatch = prefix.match(/^\[projectRoot(?:\^(\d+))?\]$/);
  if (projectRootMatch) {
    const upLevels = projectRootMatch[1];
    if (upLevels) {
      // For [projectRoot^N], go up N levels from rootDir
      const upPath = '../'.repeat(Number(upLevels));
      filepath = filepath.replace(`${prefix}/`, rootDir + '/' + upPath);
    } else {
      // For plain [projectRoot], just replace with rootDir
      filepath = filepath.replace('[projectRoot]', rootDir);
    }
  }

  return path.resolve(filepath);
}
