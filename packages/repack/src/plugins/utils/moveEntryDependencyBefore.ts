import type { Compilation } from '@rspack/core';

type MapValueType<T> = T extends Map<string, infer V> ? V : never;

type EntryDependencies = MapValueType<Compilation['entries']>['dependencies'];

interface MoveEntryDependencyBeforeConfig {
  beforeDependency: string;
  dependencyToMove: string;
}

export function moveEntryDependencyBefore(
  dependencies: EntryDependencies,
  { beforeDependency, dependencyToMove }: MoveEntryDependencyBeforeConfig
) {
  const sourceIndex = dependencies.findIndex((dependency) =>
    dependency.request?.includes(dependencyToMove)
  );

  if (sourceIndex === -1) {
    return;
  }

  const targetIndex = dependencies.findIndex(
    (dependency) => dependency.request === beforeDependency
  );

  if (targetIndex === -1) {
    return;
  }

  // target order already achieved
  if (sourceIndex < targetIndex) {
    return;
  }

  // Remove source entry dependency from its current position
  const [movedEntry] = dependencies.splice(sourceIndex, 1);
  // Insert source entry dependencyright before the target entry
  dependencies.splice(targetIndex, 0, movedEntry);
}
