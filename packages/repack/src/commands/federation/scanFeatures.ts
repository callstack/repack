import fs from 'node:fs';
import path from 'node:path';

/**
 * Static feature-folder scanner for `federation-init`.
 *
 * A regex/state-machine scanner on purpose: `@babel/parser` is not a runtime
 * dependency of this package and adding one is out of scope. Its job is a
 * dependency-NAME list, not semantics, which puts its weakness ceiling far
 * below generic parsing — and every pattern it cannot resolve statically
 * becomes an explicit honesty advisory (manifest `dynamicImportDetected`
 * semantics): the scan never claims to be complete when dynamic patterns
 * were seen.
 */
export interface FeatureScanResult {
  /** Package names, deduped and sorted; relative/alias imports excluded. */
  dependencies: string[];
  /** Honesty advisories naming `file:line` for unresolvable patterns. */
  advisories: string[];
}

const SOURCE_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
]);

/** Noise specifiers skipped entirely (compiler artifacts, not user deps). */
const IGNORED_PACKAGES = new Set([
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
]);

/**
 * The last significant token seen in code context (comments and string
 * content never set it). Only `from`, a bare `import` and a `require(`
 * open/close make a following string a dependency; `import(` and
 * template-literal `require` are dynamic patterns.
 */
type Signal =
  | ''
  | 'other'
  | 'import'
  | 'from'
  | 'require'
  | 'import-paren'
  | 'require-paren';

function collectSourceFiles(dir: string, found: string[]): void {
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Documented skip: test folders are not feature surface.
      if (entry.name === '__tests__') continue;
      collectSourceFiles(full, found);
    } else if (
      entry.isFile() &&
      SOURCE_EXTENSIONS.has(path.extname(entry.name)) &&
      // Documented skip: *.test.* files anywhere.
      !entry.name.includes('.test.')
    ) {
      found.push(full);
    }
  }
}

/** Map a bare-module specifier to its package name, or null if internal. */
function packageOf(specifier: string): string | null {
  if (
    specifier === '' ||
    specifier.startsWith('.') ||
    specifier.startsWith('/') ||
    // '@/' is a path alias, not an npm scope
    specifier.startsWith('@/') ||
    IGNORED_PACKAGES.has(specifier)
  ) {
    return null;
  }
  const segments = specifier.split('/');
  if (specifier.startsWith('@')) {
    return segments.length >= 2
      ? `${segments[0]}/${segments[1]}`
      : (segments[0] ?? null);
  }
  return segments[0] ?? null;
}

function advisory(relFile: string, line: number, what: string): string {
  return (
    `${relFile}:${line} — ${what} cannot be resolved statically; ` +
    'dependencies behind it may be missing from the scanned set, so this ' +
    'dependency list is NOT exhaustive.'
  );
}

function scanCode(
  code: string,
  relFile: string,
  dependencies: Set<string>,
  advisories: string[]
): void {
  let i = 0;
  let line = 1;
  let signal: Signal = '';

  const skipWhitespace = (from: number) => {
    let k = from;
    while (k < code.length && /\s/.test(code[k])) k++;
    return k;
  };

  while (i < code.length) {
    const ch = code[i];

    if (ch === '\n') {
      line++;
      i++;
      continue;
    }
    if (ch === ' ' || ch === '\t' || ch === '\r') {
      i++;
      continue;
    }
    if (ch === '/' && code[i + 1] === '/') {
      const nextLine = code.indexOf('\n', i);
      i = nextLine === -1 ? code.length : nextLine;
      continue;
    }
    if (ch === '/' && code[i + 1] === '*') {
      const end = code.indexOf('*/', i + 2);
      const stop = end === -1 ? code.length : end + 2;
      for (let k = i; k < stop; k++) if (code[k] === '\n') line++;
      i = stop;
      continue;
    }

    if (ch === '"' || ch === "'") {
      const stringLine = line;
      let j = i + 1;
      let value = '';
      while (j < code.length) {
        if (code[j] === '\\') {
          // Escape tracking: `\"` inside a string is content, not a terminator.
          value += code[j + 1] ?? '';
          j += 2;
          continue;
        }
        if (code[j] === ch) break;
        if (code[j] === '\n') {
          // Unterminated string literal: recover at the newline.
          line++;
        }
        value += code[j];
        j++;
      }
      i = j + 1;

      if (signal === 'from' || signal === 'import') {
        const pkg = packageOf(value);
        if (pkg) dependencies.add(pkg);
      } else if (signal === 'require-paren') {
        // Only require('lit') — anything before the closing paren is a
        // computed require and gets the honesty advisory instead.
        const after = skipWhitespace(i);
        if (code[after] === ')') {
          const pkg = packageOf(value);
          if (pkg) dependencies.add(pkg);
        } else {
          advisories.push(
            advisory(
              relFile,
              stringLine,
              'require() of a concatenated expression'
            )
          );
        }
      }
      signal = '';
      continue;
    }

    if (ch === '`') {
      if (signal === 'require-paren') {
        advisories.push(
          advisory(relFile, line, 'require() of a template literal')
        );
      }
      let j = i + 1;
      while (j < code.length) {
        if (code[j] === '\\') {
          j += 2;
          continue;
        }
        if (code[j] === '`') break;
        if (code[j] === '\n') line++;
        j++;
      }
      i = j + 1;
      signal = '';
      continue;
    }

    if (/[A-Za-z_$]/.test(ch)) {
      let j = i;
      while (j < code.length && /[\w$]/.test(code[j])) j++;
      const word = code.slice(i, j);
      i = j;
      signal =
        word === 'import' || word === 'from' || word === 'require'
          ? word
          : 'other';
      continue;
    }

    if (ch === '(') {
      if (signal === 'import') {
        // Any dynamic import() — even a literal one — may pull packages
        // the static set cannot promise; report rather than collect.
        advisories.push(advisory(relFile, line, 'dynamic import()'));
        signal = 'import-paren';
      } else if (signal === 'require') {
        signal = 'require-paren';
      } else {
        signal = 'other';
      }
      i++;
      continue;
    }

    signal = '';
    i++;
  }
}

/**
 * Statically scan a feature folder and return its dependency-name set plus
 * one honesty advisory per unresolvable dynamic pattern. Scans
 * `.js .jsx .ts .tsx .mjs .cjs`, skipping `__tests__/` directories and
 * `*.test.*` files (documented behavior).
 */
export function scanFeatureFolder(rootDir: string): FeatureScanResult {
  const files: string[] = [];
  collectSourceFiles(rootDir, files);

  const dependencies = new Set<string>();
  const advisories: string[] = [];
  for (const file of files) {
    const rel = path.relative(rootDir, file).split(path.sep).join('/');
    scanCode(fs.readFileSync(file, 'utf-8'), rel, dependencies, advisories);
  }

  return { dependencies: [...dependencies].sort(), advisories };
}
