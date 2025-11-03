import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import type { Configuration, ConfigurationObject } from '../../types.js';

// logic based on crossImport from `rspack-cli`
// reference: https://github.com/web-infra-dev/rspack/blob/b16a723d974231eb5a39fcbfd3258b283be8b3c9/packages/rspack-cli/src/utils/crossImport.ts

const readPackageUp = (cwd: string) => {
  let currentDir = path.resolve(cwd);
  let packageJsonPath = path.join(currentDir, 'package.json');

  while (!fs.existsSync(packageJsonPath)) {
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) return null;
    currentDir = parentDir;
    packageJsonPath = path.join(currentDir, 'package.json');
  }

  try {
    const packageJson = fs.readFileSync(packageJsonPath, 'utf8');
    return JSON.parse(packageJson) as { type?: 'module' };
  } catch {
    return null;
  }
};

const isEsmFile = (filePath: string) => {
  if (filePath.endsWith('.mjs') || filePath.endsWith('.mts')) return true;
  if (filePath.endsWith('.cjs') || filePath.endsWith('.cts')) return false;
  const packageJson = readPackageUp(path.dirname(filePath));
  return packageJson?.type === 'module';
};

export async function loadProjectConfig<C extends ConfigurationObject>(
  configFilePath: string
): Promise<Configuration<C>> {
  let config: Configuration<C>;

  if (isEsmFile(configFilePath)) {
    const { href: fileUrl } = url.pathToFileURL(configFilePath);
    config = await import(fileUrl);
  } else {
    config = require(configFilePath);
  }

  if ('default' in config) {
    config = config.default as Configuration<C>;
  }

  return config;
}
