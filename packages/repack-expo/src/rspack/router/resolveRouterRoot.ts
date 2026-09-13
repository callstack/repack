import fs from 'node:fs';
import path from 'node:path';
import { ExpoPluginError } from '../ExpoPluginError.js';

function isPathInside(child: string, parent: string): boolean {
  const relative = path.relative(parent, child);
  return (
    relative === '' ||
    (!relative.startsWith('..') && !path.isAbsolute(relative))
  );
}

export function resolveRouterRoot(
  projectRoot: string,
  configuredRoot?: string
): string {
  const routerRoot =
    configuredRoot ??
    (fs.existsSync(path.join(projectRoot, 'src', 'app')) ? 'src/app' : 'app');
  const absoluteRouterRoot = path.resolve(projectRoot, routerRoot);

  if (!isPathInside(absoluteRouterRoot, projectRoot)) {
    throw new ExpoPluginError({
      code: 'INVALID_ROUTER_ROOT',
      message: `The Expo Router root ${routerRoot} resolves outside ${projectRoot}.`,
      recovery:
        'Set ExpoPlugin.routerRoot to a directory inside the Expo project.',
    });
  }

  return path
    .relative(projectRoot, absoluteRouterRoot)
    .split(path.sep)
    .join('/');
}
