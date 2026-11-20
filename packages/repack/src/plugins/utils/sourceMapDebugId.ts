// The lookbehind skips escaped quotes, so a `"debugId":` inside `sourcesContent` doesn't match.
const DEBUG_ID_REGEX = /(?<!\\)"debug_?[iI]d"\s*:\s*"([^"]+)"/;
const DEBUG_ID_FIELD_REGEX = /(?<!\\)"(debugId|debug_id)"(\s*:\s*)"[^"]*"/g;

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
 * Sentry's tooling reads either spelling depending on version, so both are written. Existing
 * fields are overwritten in place, since sentry-cli rejects a map with duplicate keys.
 */
export function addDebugIdToSourceMap(
  sourceMap: string,
  debugId: string
): string {
  const end = sourceMap.lastIndexOf('}');
  if (end === -1) {
    throw new Error('Source map is not a JSON object');
  }

  const present = new Set<string>();
  const replaced = sourceMap.replace(
    DEBUG_ID_FIELD_REGEX,
    (_match, key: string, colon: string) => {
      present.add(key);
      return `"${key}"${colon}"${debugId}"`;
    }
  );
  const missing = ['debugId', 'debug_id']
    .filter((key) => !present.has(key))
    .map((key) => `"${key}":"${debugId}"`);
  if (missing.length === 0) {
    return replaced;
  }

  const head = replaced.slice(0, replaced.lastIndexOf('}')).trimEnd();
  const separator = head.endsWith('{') ? '' : ',';
  return `${head}${separator}${missing.join(',')}}`;
}
