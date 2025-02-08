interface ReorderEntriesConfig {
  targetEntryPattern: string;
  beforeEntryRequest: string;
}

export function reorderDependencies(
  dependencies: any[],
  config: ReorderEntriesConfig
) {
  const { targetEntryPattern, beforeEntryRequest } = config;

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
