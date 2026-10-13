import type { EntryNormalized } from '@rspack/core';
import { ExpoPluginError } from '../ExpoPluginError.js';

export function configureExpoCompilerEntry(
  entry: EntryNormalized,
  entryPath: string,
  runtimeEntryPath: string
): EntryNormalized {
  if (typeof entry === 'function') {
    throw new ExpoPluginError({
      code: 'DYNAMIC_ENTRY_UNSUPPORTED',
      message: 'ExpoPlugin cannot configure a dynamic Rspack entry.',
      recovery:
        'Use a single static entry; ExpoPlugin will resolve its import from package.json#main.',
    });
  }

  const entryNames = Object.keys(entry);
  if (entryNames.length > 1) {
    throw new ExpoPluginError({
      code: 'AMBIGUOUS_ENTRY',
      message: `ExpoPlugin found multiple Rspack entries: ${entryNames.join(', ')}.`,
      recovery:
        'Use one native application entry. Extra chunks should be created with dynamic import().',
    });
  }

  const entryName = entryNames[0] ?? 'main';
  return {
    [entryName]: {
      ...(entry[entryName] ?? {}),
      import: [runtimeEntryPath, entryPath],
    },
  };
}
