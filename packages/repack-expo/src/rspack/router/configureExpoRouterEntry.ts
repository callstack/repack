import type { RuleSetRules } from '@rspack/core';
import type { ResolvedExpoEntry } from '../entry/resolveExpoEntry.js';

const EXPO_ROUTER_ENTRY = 'expo-router/entry';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function configureExpoRouterEntry(
  rules: RuleSetRules,
  entry: ResolvedExpoEntry,
  loaderPath: string
): boolean {
  if (entry.request !== EXPO_ROUTER_ENTRY) return false;

  rules.push({
    enforce: 'pre',
    test: new RegExp(`^${escapeRegExp(entry.entryPath)}$`),
    use: { loader: loaderPath },
  });
  return true;
}
