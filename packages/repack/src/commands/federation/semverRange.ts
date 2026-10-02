/**
 * Minimal semver-range math for the federation doctor. Supports the subset of
 * range syntax that appears in `shared[].requiredVersion`: exact versions,
 * caret (`^15.0.0`), tilde (`~0.74.5`), `>=18` and major/minor `x` ranges
 * (`19.x`). Anything else is reported as unsupported by returning `null`,
 * so callers can warn instead of failing.
 */

/** Parsed `[major, minor, patch]` tuple. */
export type Version = [number, number, number];

/** Half-open interval `[lower, upper)` with `null` meaning unbounded. */
export interface VersionInterval {
  lower: Version | null;
  upper: Version | null;
}

const RANGE_RE =
  /^(\^|~|>=)?v?(\d+|x|X|\*)(?:\.(\d+|x|X|\*)(?:\.(\d+|x|X|\*))?)?$/;

function isWildcard(part: string | undefined): boolean {
  return part === 'x' || part === 'X' || part === '*';
}

function isUnbounded(part: string | undefined): boolean {
  return part === undefined || part === 'x' || part === 'X' || part === '*';
}

function compareVersions(a: Version, b: Version): number {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

/**
 * Parse a version range into an interval. Returns `null` for syntax this
 * helper does not understand (comparators other than `>=`, hyphen ranges,
 * unions, prereleases, and wildcards mixed with `^`/`~`/`>=`).
 */
export function parseRange(raw: string): VersionInterval | null {
  const range = raw.trim();
  if (range === '' || isUnbounded(range)) {
    return { lower: null, upper: null };
  }
  const match = RANGE_RE.exec(range);
  if (!match) return null;
  const [, op = '', a, b, c] = match;

  // Only plain ranges allow wildcards; `^1.x`, `~1.x` and `>=x` stay unsupported.
  if (op !== '' && (isWildcard(a) || isWildcard(b) || isWildcard(c))) {
    return null;
  }

  const major = Number.parseInt(a, 10);
  const minor = isUnbounded(b) ? undefined : Number.parseInt(b as string, 10);
  const patch = isUnbounded(c) ? undefined : Number.parseInt(c as string, 10);
  const lower: Version = [major, minor ?? 0, patch ?? 0];

  if (op === '>=') {
    return { lower, upper: null };
  }
  if (op === '^') {
    if (major > 0) return { lower, upper: [major + 1, 0, 0] };
    if (minor === undefined) return { lower, upper: [1, 0, 0] };
    if (minor > 0) return { lower, upper: [0, minor + 1, 0] };
    // ^0.0.x only allows patch-level changes within 0.0
    return { lower, upper: [0, 0, (patch ?? 0) + 1] };
  }
  if (op === '~') {
    return minor === undefined
      ? { lower, upper: [major + 1, 0, 0] }
      : { lower, upper: [major, minor + 1, 0] };
  }
  // Plain version or x-range: the interval covers exactly what it allows.
  if (minor === undefined) return { lower, upper: [major + 1, 0, 0] };
  if (patch === undefined) return { lower, upper: [major, minor + 1, 0] };
  return { lower, upper: [major, minor, patch + 1] };
}

/**
 * Whether two intervals leave at least one version allowed.
 */
export function intervalsIntersect(
  a: VersionInterval,
  b: VersionInterval
): boolean {
  // A `null` lower bound means "unbounded below", so the effective lower bound
  // is the other side; likewise a `null` upper bound means "unbounded above".
  const lower =
    a.lower === null
      ? b.lower
      : b.lower === null
        ? a.lower
        : compareVersions(a.lower, b.lower) >= 0
          ? a.lower
          : b.lower;
  const upper =
    a.upper === null
      ? b.upper
      : b.upper === null
        ? a.upper
        : compareVersions(a.upper, b.upper) <= 0
          ? a.upper
          : b.upper;
  if (lower === null || upper === null) return true;
  return compareVersions(lower, upper) < 0;
}

/**
 * Whether two range strings can resolve to a common version.
 * Returns `null` when either range uses syntax this helper does not support.
 */
export function rangesIntersect(a: string, b: string): boolean | null {
  const parsedA = parseRange(a);
  const parsedB = parseRange(b);
  if (parsedA === null || parsedB === null) return null;
  return intervalsIntersect(parsedA, parsedB);
}
