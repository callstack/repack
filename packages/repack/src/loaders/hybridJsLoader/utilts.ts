import { loadOptions } from '@babel/core';

export function isTypeScriptSource(fileName: string) {
  return !!fileName && fileName.endsWith('.ts');
}

export function isTSXSource(fileName: string) {
  return !!fileName && fileName.endsWith('.tsx');
}

export function getProjectBabelConfig(projectRoot: string) {
  const babelConfig = loadOptions({
    cwd: projectRoot,
    root: projectRoot,
  });
  return babelConfig ?? {};
}
