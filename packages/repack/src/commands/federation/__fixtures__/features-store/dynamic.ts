// Every dynamic pattern the scanner cannot resolve must produce an
// honesty advisory naming this file and line — never a silent pass.
export async function loadLazy(name: string) {
  return import('./lazy-' + name);
}

export function computedDep(kind: string) {
  return require('pkg-' + kind);
}

export function templateDep(area: string) {
  return require(`@geo/${area}-map`);
}

export function literalDynamic() {
  return import('some-async-pkg');
}
