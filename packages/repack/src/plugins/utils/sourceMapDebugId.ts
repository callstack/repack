// The lookbehind skips escaped quotes, so a `"debugId":` inside `sourcesContent` doesn't match.
const DEBUG_ID_REGEX = /(?<!\\)"debug_?[iI]d"\s*:\s*"([^"]+)"/;

/**
 * Reads the Debug ID from a serialized source map, if it has one.
 */
export function getSourceMapDebugId(sourceMap: string): string | undefined {
  return DEBUG_ID_REGEX.exec(sourceMap)?.[1];
}

/**
 * Adds a Debug ID to a serialized source map.
 *
 * Splices the fields into the JSON text instead of parsing it, since release maps can be tens of
 * megabytes and a parse/stringify round-trip costs hundreds of megabytes of memory per map.
 * Sentry's tooling reads either spelling depending on version, so both are written.
 */
export function addDebugIdToSourceMap(
  sourceMap: string,
  debugId: string
): string {
  const end = sourceMap.lastIndexOf('}');
  if (end === -1) {
    throw new Error('Source map is not a JSON object');
  }

  const head = sourceMap.slice(0, end).trimEnd();
  const separator = head.endsWith('{') ? '' : ',';
  return `${head}${separator}"debugId":"${debugId}","debug_id":"${debugId}"}`;
}
