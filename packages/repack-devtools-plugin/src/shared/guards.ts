import type { DevServerState } from './types.js';

/**
 * Readers for values whose shape this package does not control: realm
 * globals (`__FEDERATION__`, `ErrorUtils`), ScriptManager and MF event
 * payloads, and JSON from the dev server. Everything enters as `unknown` and
 * is narrowed field by field, so a shape change upstream degrades to missing
 * data instead of a crash.
 */

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const getProp = (value: unknown, key: string): unknown =>
  isRecord(value) || typeof value === 'function'
    ? Reflect.get(value, key)
    : undefined;

export const readString = (value: unknown, key: string) => {
  const prop = getProp(value, key);
  return typeof prop === 'string' ? prop : undefined;
};

export const readNumber = (value: unknown, key: string) => {
  const prop = getProp(value, key);
  return typeof prop === 'number' ? prop : undefined;
};

export const readBoolean = (value: unknown, key: string) => {
  const prop = getProp(value, key);
  return typeof prop === 'boolean' ? prop : undefined;
};

export const readArray = (value: unknown, key: string): unknown[] => {
  const prop = getProp(value, key);
  return Array.isArray(prop) ? prop : [];
};

export const toStringArray = (value: unknown): string[] | undefined =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : undefined;

export const toStringRecord = (
  value: unknown
): Record<string, string> | undefined => {
  if (!isRecord(value)) return undefined;
  const entries = Object.entries(value).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string'
  );
  return Object.fromEntries(entries);
};

export const readGlobal = (key: string): unknown => getProp(globalThis, key);

/** Calls `target[key](...args)` when it is a function; otherwise `undefined`. */
export const callMethod = (
  target: unknown,
  key: string,
  args: unknown[]
): unknown => {
  const method = getProp(target, key);
  return typeof method === 'function'
    ? Reflect.apply(method, target, args)
    : undefined;
};

/**
 * Checks the top-level shape of `GET /repack-devtools/state`. The payload is
 * produced by this package's own middleware, so the nested records are
 * trusted once the envelope matches.
 */
export const isDevServerState = (value: unknown): value is DevServerState =>
  isRecord(value) &&
  typeof value.startedAt === 'number' &&
  Array.isArray(value.compilations) &&
  Array.isArray(value.requests) &&
  Array.isArray(value.diagnostics);
