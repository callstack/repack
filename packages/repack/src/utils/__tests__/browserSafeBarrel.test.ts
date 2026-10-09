import fs from 'node:fs';
import { isBuiltin } from 'node:module';
import path from 'node:path';

/**
 * Guards the browser-safety contract of the bundle-facing `utils` barrel:
 * no Node builtin module may be reachable through **static** import edges
 * from `utils/index.ts` (or from the package public entry's `./utils`
 * subtree). Node builtins may only be reached lazily — `require()` inside a
 * function body — so importing the barrel in a browser/RN bundle never
 * drags `node:fs`-style modules into the graph.
 *
 * How the walker works:
 * - Reads source files from disk and extracts static edges with a regex for
 *   `import … from '…'`, `export … from '…'` and side-effect `import '…'`
 *   (single-quoted, matching the repo's biome quote style).
 * - `import type …` / `export type … from` are erased by TypeScript and are
 *   not runtime edges, so they are excluded.
 * - `import()` and `require()` are excluded as non-static by construction:
 *   the patterns below never match them.
 * - Relative specifiers resolve `./x.js` → `./x.ts` (the repo's ESM-style
 *   authoring convention). Bare specifiers (`dedent`, `webpack`, …) are
 *   external packages: recorded as builtin-check candidates but never
 *   walked into — the contract is about this repo's own static graph.
 *
 * Documented exclusions (pre-existing usage, out of scope for the resolver
 * move that introduced this test):
 * - From the package public entry, only the `./utils` subtree is walked.
 *   `export * as plugins from './plugins/index.js'` and the other entry
 *   exports statically reach Node builtins today (e.g. the federation
 *   manifest plugin imports `node:fs`); those namespaces are not part of
 *   the browser-safe contract.
 * - Pre-existing edges inside the browser-safe target zone are pinned in
 *   `DOCUMENTED_EXCLUSIONS` below, each with its own scope. They shipped
 *   before this test existed; the resolver move changes neither of them.
 *   The exclusion is exact — new edges out of `utils/`, new files under
 *   `loaders/`, or new builtins are still violations.
 */

const srcRoot = path.resolve(__dirname, '../..');

interface Edge {
  /** Specifier as written, e.g. './federated.js' or 'node:fs'. */
  spec: string;
  /** True for `import type` / `export type … from` (erased at compile time). */
  typeOnly: boolean;
}

/** Strip comments and template-literal bodies, keeping the rest verbatim. */
function stripCommentsAndTemplates(source: string): string {
  let out = '';
  let i = 0;
  const state: { kind: 'code' | 'line' | 'block' | 'template' } = {
    kind: 'code',
  };
  while (i < source.length) {
    const two = source.slice(i, i + 2);
    if (state.kind === 'code') {
      if (two === '//') {
        state.kind = 'line';
        i += 2;
        continue;
      }
      if (two === '/*') {
        state.kind = 'block';
        i += 2;
        continue;
      }
      if (source[i] === '`') {
        state.kind = 'template';
        out += '``';
        i += 1;
        continue;
      }
      if (source[i] === "'" || source[i] === '"') {
        // Keep single/double-quoted strings verbatim: import specifiers are
        // written with them. Template literals (which can embed sample code)
        // were already emptied above.
        const quote = source[i];
        let j = i + 1;
        while (j < source.length && source[j] !== quote) {
          j += source[j] === '\\' ? 2 : 1;
        }
        out += source.slice(i, j + 1);
        i = j + 1;
        continue;
      }
      out += source[i];
      i += 1;
      continue;
    }
    if (state.kind === 'line') {
      if (source[i] === '\n') {
        state.kind = 'code';
        out += '\n';
      }
      i += 1;
      continue;
    }
    if (state.kind === 'block') {
      if (two === '*/') {
        state.kind = 'code';
        i += 2;
        continue;
      }
      if (source[i] === '\n') out += '\n';
      i += 1;
      continue;
    }
    // template: skip until the closing backtick (no nested interpolation
    // is expected in the files this walker covers).
    if (source[i] === '\\') {
      i += 2;
      continue;
    }
    if (source[i] === '`') {
      state.kind = 'code';
    }
    i += 1;
  }
  return out;
}

const FROM_EDGE = /(?:^|[\s;}])(import|export)\b([\s\S]*?)\bfrom\s*'([^']+)'/g;
const SIDE_EFFECT_IMPORT = /(?:^|[\s;}])import\s*'([^']+)'/g;

/** Extract the static import/export-from edges of one source file. */
function staticEdgesOf(filePath: string): Edge[] {
  const source = stripCommentsAndTemplates(fs.readFileSync(filePath, 'utf-8'));
  const edges: Edge[] = [];
  for (const match of source.matchAll(FROM_EDGE)) {
    const clause = match[2];
    // `import x from 'a'; import y from 'b'` on one line would make the lazy
    // clause span junk; a genuine clause never contains quotes or semicolons.
    if (/[';]/.test(clause)) continue;
    edges.push({ spec: match[3], typeOnly: /^\s*type\b/.test(clause) });
  }
  for (const match of source.matchAll(SIDE_EFFECT_IMPORT)) {
    edges.push({ spec: match[1], typeOnly: false });
  }
  return edges;
}

/** Resolve a relative specifier using the repo's `./x.js` → `./x.ts` rule. */
function resolveRelative(fromFile: string, spec: string): string | null {
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [
    base.replace(/\.js$/, '.ts'),
    base.replace(/\.js$/, '.tsx'),
    `${base.replace(/\.js$/, '')}.ts`,
    `${base.replace(/\.js$/, '')}/index.ts`,
  ];
  for (const candidate of new Set(candidates)) {
    if (fs.existsSync(candidate) && candidate.endsWith('.ts')) {
      return candidate;
    }
  }
  return null;
}

function specReachesBuiltin(spec: string): boolean {
  return spec.startsWith('node:') || isBuiltin(spec);
}

interface Exclusion {
  /** Exact importing file the exception applies to. */
  file: string;
  /** Exact specifier that is allowed (e.g. 'node:url' or '../loaders/x.js'). */
  spec: string;
  /** Where the walk may follow the edge: nothing, the importing dir's subtree, or a dir. */
  follow: 'none' | 'self' | string;
  reason: string;
}

/**
 * Pre-existing edges inside the browser-safe target zone, pinned visibly.
 * Each one shipped before this test existed; `utils/getAssetTransformRules.ts`
 * statically imports `loaders/assetsLoader/options.js` (which imports
 * `schema-utils`, used for loader option schemas, not runtime bundling),
 * `utils/federated.ts` statically imports `node:url`, and
 * `utils/getDirname.ts` statically imports `node:path` and `node:url`.
 * Removing any of them is a separate behavior change, out of scope for the
 * resolver move that introduced this test. The exclusions are exact per
 * (file, spec) pair: a NEW static builtin or escape edge anywhere in the
 * walked graph is a violation.
 */
const DOCUMENTED_EXCLUSIONS: Exclusion[] = [
  {
    file: path.join(srcRoot, 'utils/federated.ts'),
    spec: 'node:url',
    follow: 'none',
    reason: 'pre-existing static node:url import',
  },
  {
    file: path.join(srcRoot, 'utils/getDirname.ts'),
    spec: 'node:path',
    follow: 'none',
    reason: 'pre-existing static node:path import',
  },
  {
    file: path.join(srcRoot, 'utils/getDirname.ts'),
    spec: 'node:url',
    follow: 'none',
    reason: 'pre-existing static node:url import',
  },
  {
    file: path.join(srcRoot, 'utils/getAssetTransformRules.ts'),
    spec: '../loaders/assetsLoader/options.js',
    follow: path.join(srcRoot, 'loaders/assetsLoader'),
    reason:
      'pre-existing utils → loaders edge; subtree walk is bounded to the assetsLoader directory',
  },
];

function exclusionFor(exclusions: Exclusion[], file: string, spec: string) {
  return exclusions.find(
    (exclusion) => exclusion.file === file && exclusion.spec === spec
  );
}

function collectViolations(
  entries: Array<{
    file: string;
    restrictToDir?: string;
    exclusions?: Exclusion[];
  }>
): string[] {
  const violations: string[] = [];
  const queue = [...entries];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const { file, restrictToDir, exclusions = [] } = queue.shift()!;
    if (seen.has(file)) continue;
    seen.add(file);

    for (const edge of staticEdgesOf(file)) {
      if (edge.typeOnly) continue;
      const exclusion = exclusionFor(exclusions, file, edge.spec);
      if (specReachesBuiltin(edge.spec) && !exclusion) {
        violations.push(
          `${path.relative(srcRoot, file)} statically imports '${edge.spec}'`
        );
      }
      if (!edge.spec.startsWith('.')) continue; // external package: not walked
      const resolved = resolveRelative(file, edge.spec);
      if (!resolved) continue;
      const insideRestricted =
        !restrictToDir || resolved.startsWith(restrictToDir + path.sep);
      if (exclusion) {
        if (exclusion.follow === 'none' || !insideRestricted) continue;
        queue.push({
          file: resolved,
          restrictToDir:
            typeof exclusion.follow === 'string'
              ? exclusion.follow
              : restrictToDir,
          exclusions,
        });
        continue;
      }
      if (!insideRestricted) {
        continue; // outside the restricted subtree: documented exclusion
      }
      queue.push({ file: resolved, restrictToDir, exclusions });
    }
  }
  return violations;
}

describe('browser-safe utils barrel', () => {
  it('has no builtin reachable through static edges from utils/index.ts', () => {
    const violations = collectViolations([
      {
        file: path.join(srcRoot, 'utils/index.ts'),
        exclusions: DOCUMENTED_EXCLUSIONS,
      },
    ]);
    expect(violations).toEqual([]);
  });

  it('keeps the public entry builtin-free through the ./utils subtree', () => {
    const violations = collectViolations([
      {
        file: path.join(srcRoot, 'index.ts'),
        restrictToDir: path.join(srcRoot, 'utils'),
        exclusions: DOCUMENTED_EXCLUSIONS,
      },
    ]);
    expect(violations).toEqual([]);
  });

  // Forward contract for the resolver move and the upcoming defineShared:
  // utils may reach Node builtins only through this module, and only via
  // require() inside function bodies — so it must exist with zero static
  // import edges. A future refactor adding a top-level import there must
  // update this test deliberately.
  it('exposes sharedVersionResolver.ts with zero static import edges', () => {
    const resolver = path.join(srcRoot, 'utils/sharedVersionResolver.ts');
    expect(fs.existsSync(resolver)).toBe(true);
    expect(staticEdgesOf(resolver)).toEqual([]);
  });
});
