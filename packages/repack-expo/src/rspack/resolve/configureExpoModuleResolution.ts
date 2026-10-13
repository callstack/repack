import path from 'node:path';

export function configureExpoModuleResolution(
  modules: string[] | undefined,
  projectRoot: string
): string[] {
  const projectNodeModules = path.join(projectRoot, 'node_modules');
  if (!modules) return [projectNodeModules, 'node_modules'];
  if (modules.includes(projectNodeModules)) return modules;
  return [projectNodeModules, ...modules];
}
