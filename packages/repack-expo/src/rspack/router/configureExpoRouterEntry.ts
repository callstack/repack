import fs from 'node:fs';
import type { RuleSetRules } from '@rspack/core';
import type { ResolvedExpoEntry } from '../entry/resolveExpoEntry.js';

const EXPO_ROUTER_ENTRY = 'expo-router/entry';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isExpoRouterEntry(entry: ResolvedExpoEntry): boolean {
  if (entry.request === EXPO_ROUTER_ENTRY) return true;

  try {
    const routerEntryPath = fs.realpathSync(
      require.resolve(EXPO_ROUTER_ENTRY, { paths: [entry.projectRoot] })
    );
    return entry.entryPath === routerEntryPath;
  } catch {
    return false;
  }
}

export function configureExpoRouterEntry(
  rules: RuleSetRules,
  entry: ResolvedExpoEntry,
  loaderPath: string
): boolean {
  if (!isExpoRouterEntry(entry)) return false;

  rules.push({
    enforce: 'pre',
    test: new RegExp(`^${escapeRegExp(entry.entryPath)}$`),
    use: { loader: loaderPath },
  });
  return true;
}
