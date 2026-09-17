import fs from 'node:fs';
import path from 'node:path';
import type { LoaderContext } from '@rspack/core';

export const raw = false;

function resolveRouterModule(routerRoot: string, request: string): string {
  const modulePath = path.join(routerRoot, 'build', `${request}.js`);
  if (fs.existsSync(modulePath)) return modulePath;

  throw new Error(
    `@callstack/repack-expo cannot find Expo Router's ${request} module at ${modulePath}. ` +
      'Use a supported Expo Router native entry or configure a custom application entry.'
  );
}

export default function expoRouterEntryLoader(
  this: LoaderContext<Record<string, never>>
): string {
  this.cacheable?.(true);

  const routerRoot = path.dirname(this.resourcePath);
  const qualifiedEntry = resolveRouterModule(routerRoot, 'qualified-entry');
  const renderRootComponent = resolveRouterModule(
    routerRoot,
    'renderRootComponent'
  );

  return [
    `const { App } = require(${JSON.stringify(qualifiedEntry)});`,
    `const { renderRootComponent } = require(${JSON.stringify(renderRootComponent)});`,
    'renderRootComponent(App);',
  ].join('\n');
}
