import type { Compilation } from '@rspack/core';

type MapValueType<T> = T extends Map<string, infer V> ? V : never;

type EntryDependencies = MapValueType<Compilation['entries']>['dependencies'];

interface ReorderEntriesConfig {
  targetEntryPattern: string;
  beforeEntryRequest: string;
}

export function reorderDependencies(
  dependencies: EntryDependencies,
  { targetEntryPattern, beforeEntryRequest }: ReorderEntriesConfig
) {
  const targetIndex = dependencies.findIndex((dependency) =>
    dependency.request?.includes(targetEntryPattern)
  );

  if (targetIndex === -1) {
    return;
  }

  const beforeEntryIndex = dependencies.findIndex(
    (dependency) => dependency.request === beforeEntryRequest
  );

  if (beforeEntryIndex === -1) {
    return;
  }

  if (targetIndex < beforeEntryIndex) {
    return;
  }

  // Remove target entry from its current position
  const [targetEntry] = dependencies.splice(targetIndex, 1);
  // Insert target entry right before the specified entry
  dependencies.splice(beforeEntryIndex, 0, targetEntry);
}
