/**
 * Key-level merge primitives for `federation-init`. Every surface the
 * command touches is merged by parsed data — never marker-driven wholesale
 * regeneration — so re-runs add only what is genuinely missing and manual
 * edits always survive. Marker comments in generated configs are provenance
 * only.
 */

/** Result of a text-level merge: `changed` false means no file write. */
export interface MergeResult {
  changed: boolean;
  after?: string;
  /** Present when the edit could not be anchored safely: instructions for a human. */
  manualStep?: string;
}

function stringifyJson(document: unknown): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}

/**
 * Add missing `dependencies` entries to a package.json document, preserving
 * key order and never touching existing values (divergence alignment is a
 * separate, explicit operation).
 */
export function mergePackageJsonDeps(
  source: string | null,
  remoteName: string,
  deps: Record<string, string>
): { after: string; added: string[] } {
  if (source === null) {
    const dependencies: Record<string, string> = {};
    for (const name of Object.keys(deps).sort())
      dependencies[name] = deps[name];
    return {
      after: stringifyJson({
        name: remoteName,
        version: '0.0.0',
        private: true,
        dependencies,
      }),
      added: Object.keys(dependencies),
    };
  }

  const document = JSON.parse(source) as {
    dependencies?: Record<string, string>;
  };
  document.dependencies = document.dependencies ?? {};
  const added: string[] = [];
  for (const name of Object.keys(deps).sort()) {
    if (!(name in document.dependencies)) {
      document.dependencies[name] = deps[name];
      added.push(name);
    }
  }
  return { after: stringifyJson(document), added };
}

/** Rewrite declared dependency versions in a package.json document. */
export function rewritePackageJsonDeps(
  source: string,
  deps: Record<string, string>
): {
  after: string;
  changed: boolean;
  /** Previous declared value per rewritten package, for old→new reports. */
  previous: Record<string, string | undefined>;
} {
  const document = JSON.parse(source) as {
    dependencies?: Record<string, string>;
  };
  document.dependencies = document.dependencies ?? {};
  const previous: Record<string, string | undefined> = {};
  let changed = false;
  for (const [name, version] of Object.entries(deps)) {
    previous[name] = document.dependencies[name];
    if (document.dependencies[name] !== version) {
      document.dependencies[name] = version;
      changed = true;
    }
  }
  return { after: stringifyJson(document), changed, previous };
}

/**
 * Add a missing `remotes.<name>` entry to a `repack-federation.json`
 * document. Existing entries are never modified; creating the file from
 * scratch seeds a schema-valid minimal document.
 */
export function mergeFederationConfig(
  source: string | null,
  remoteName: string,
  entry: Record<string, unknown>
): MergeResult {
  if (source === null) {
    return {
      changed: true,
      after: stringifyJson({
        host: { manifest: 'build' },
        remotes: { [remoteName]: entry },
      }),
    };
  }
  const document = JSON.parse(source) as {
    remotes?: Record<string, unknown>;
  };
  document.remotes = document.remotes ?? {};
  if (remoteName in document.remotes) {
    return { changed: false, after: source };
  }
  document.remotes[remoteName] = entry;
  return { changed: true, after: stringifyJson(document) };
}

// --- Host-config text surgery ------------------------------------------------

/**
 * Produce a same-length view of the source where comment and string content
 * is blanked (newlines kept). All structural scanning runs on the masked
 * view, so the words `remotes`/`name` inside strings or comments can never
 * anchor an insertion; values are read from the original by index.
 */
function maskNonCode(source: string): string {
  let out = '';
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (c === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') {
        out += ' ';
        i++;
      }
      continue;
    }
    if (c === '/' && source[i + 1] === '*') {
      while (
        i < source.length &&
        !(source[i] === '*' && source[i + 1] === '/')
      ) {
        out += source[i] === '\n' ? '\n' : ' ';
        i++;
      }
      out += '  ';
      i = Math.min(i + 2, source.length);
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      // Quote characters survive (so quoted keys stay visible to structural
      // scans); string content is blanked (so words inside can never anchor).
      out += c;
      i++;
      while (i < source.length) {
        if (source[i] === '\\') {
          out += source[i + 1] === '\n' ? '\n' : ' ';
          out += ' ';
          i += 2;
          continue;
        }
        if (source[i] === c) {
          out += c;
          i++;
          break;
        }
        out += source[i] === '\n' ? '\n' : ' ';
        i++;
      }
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/** Read a quoted string literal from the ORIGINAL source at `start`. */
function readQuoted(
  source: string,
  start: number
): { value: string; end: number } | null {
  const quote = source[start];
  if (quote !== "'" && quote !== '"') return null;
  let value = '';
  let i = start + 1;
  while (i < source.length) {
    if (source[i] === '\\') {
      value += source[i + 1] ?? '';
      i += 2;
      continue;
    }
    if (source[i] === quote) return { value, end: i + 1 };
    value += source[i];
    i++;
  }
  return null;
}

/** Index just past the bracket matching the opener at `open` (masked view). */
function matchBracket(masked: string, open: number): number {
  const pairs: Record<string, string> = { '(': ')', '{': '}', '[': ']' };
  const closers = new Set(Object.values(pairs));
  const stack: string[] = [];
  for (let i = open; i < masked.length; i++) {
    const c = masked[i];
    if (pairs[c]) stack.push(pairs[c]);
    else if (closers.has(c)) {
      if (stack.pop() !== c) return -1;
      if (stack.length === 0) return i;
    }
  }
  return -1;
}

interface PropertyHit {
  name: string;
  /** Index of the token start in the source. */
  tokenStart: number;
  /** Index of the `:` separator in the source. */
  colon: number;
}

/**
 * Collect depth-0 property keys of the object literal whose opening `{` sits
 * at `open` (masked view), including quoted keys. Values are not descended
 * into: depth tracking skips nested structures.
 */
function topLevelProperties(
  source: string,
  masked: string,
  open: number
): { props: PropertyHit[]; close: number } {
  const close = matchBracket(masked, open);
  const props: PropertyHit[] = [];
  if (close === -1) return { props, close: -1 };

  let depth = 0;
  let i = open + 1;
  const skipWs = (from: number) => {
    let k = from;
    while (k < close && /\s/.test(masked[k])) k++;
    return k;
  };

  while (i < close) {
    const c = masked[i];
    if (c === '{' || c === '[' || c === '(') {
      depth++;
      i++;
      continue;
    }
    if (c === '}' || c === ']' || c === ')') {
      depth--;
      i++;
      continue;
    }
    if (depth > 0) {
      i++;
      continue;
    }
    if (c === '`') {
      let j = i + 1;
      while (j < close && masked[j] !== '`') j++;
      i = j + 1;
      continue;
    }
    if (c === "'" || c === '"') {
      const quoted = readQuoted(source, i);
      if (!quoted) break;
      const afterKey = skipWs(quoted.end);
      if (masked[afterKey] === ':') {
        props.push({ name: quoted.value, tokenStart: i, colon: afterKey });
      }
      i = afterKey + 1;
      continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i;
      while (j < close && /[\w$]/.test(masked[j])) j++;
      const token = masked.slice(i, j);
      const afterToken = skipWs(j);
      if (masked[afterToken] === ':') {
        props.push({ name: token, tokenStart: i, colon: afterToken });
      }
      i = afterToken + 1;
      continue;
    }
    i++;
  }
  return { props, close };
}

function indentOfLine(source: string, index: number): string {
  const lineStart = source.lastIndexOf('\n', index) + 1;
  const match = /^[ \t]*/.exec(source.slice(lineStart, index));
  return match ? match[0] : '';
}

function manualInstruction(name: string, why: string): string {
  return (
    `Register remote "${name}" manually in the host Module Federation plugin: ` +
    `add '${name}': '${name}@${name}/remoteEntry.js' to its remotes object. ` +
    `(${why})`
  );
}

/**
 * Anchor-safely add `'<name>': '<entryValue>'` to the host config's Module
 * Federation `remotes` object. Anchors, in order: an existing `remotes: {}`
 * block, then an insertion point after the plugin's `name:` property. When
 * neither can be located unambiguously, returns a manual instruction instead
 * of a guessed hunk — the plan shows it pre-confirm and `--yes` aborts
 * rather than silently skipping a required registration.
 */
export function ensureRemotesEntry(
  source: string,
  name: string,
  entryValue: string
): MergeResult {
  const masked = maskNonCode(source);

  const callSites: number[] = [];
  const pluginRe = /ModuleFederationPlugin(?:V1|V2)\b/g;
  let match = pluginRe.exec(masked);
  while (match) {
    let i = match.index + match[0].length;
    while (i < masked.length && /\s/.test(masked[i])) i++;
    if (masked[i] === '(') callSites.push(i);
    match = pluginRe.exec(masked);
  }

  if (callSites.length === 0) {
    return {
      changed: false,
      manualStep: manualInstruction(
        name,
        'no ModuleFederationPluginV1/V2 call site could be located'
      ),
    };
  }
  if (callSites.length > 1) {
    return {
      changed: false,
      manualStep: manualInstruction(
        name,
        `the config has multiple (${callSites.length}) Module Federation plugin call sites — the anchor is ambiguous`
      ),
    };
  }

  let optionsOpen = callSites[0] + 1;
  while (optionsOpen < masked.length && /\s/.test(masked[optionsOpen]))
    optionsOpen++;
  if (masked[optionsOpen] !== '{') {
    return {
      changed: false,
      manualStep: manualInstruction(
        name,
        'the plugin options object could not be brace-matched'
      ),
    };
  }

  const { props, close } = topLevelProperties(source, masked, optionsOpen);
  if (close === -1) {
    return {
      changed: false,
      manualStep: manualInstruction(
        name,
        'the plugin options object is not brace-balanced'
      ),
    };
  }

  const entryLine = (indent: string) => `${indent}'${name}': '${entryValue}',`;

  const remotesProp = props.find((p) => p.name === 'remotes');
  if (remotesProp) {
    let valueStart = remotesProp.colon + 1;
    while (valueStart < source.length && /\s/.test(masked[valueStart]))
      valueStart++;
    if (masked[valueStart] !== '{') {
      return {
        changed: false,
        manualStep: manualInstruction(
          name,
          'the host remotes property is not an object literal'
        ),
      };
    }
    const inner = topLevelProperties(source, masked, valueStart);
    if (inner.close === -1) {
      return {
        changed: false,
        manualStep: manualInstruction(
          name,
          'the host remotes object is not brace-balanced'
        ),
      };
    }
    if (inner.props.some((p) => p.name === name)) {
      return { changed: false, after: source };
    }
    const closeIndent = indentOfLine(source, inner.close);
    const innerIndent = `${closeIndent}  `;
    const between = source.slice(valueStart + 1, inner.close);
    const trimmedEnd = between.replace(/\s+$/, '');
    let replacement: string;
    if (trimmedEnd.trim() === '') {
      replacement = `{${entryLine(innerIndent)}\n${closeIndent}}`;
    } else if (
      trimmedEnd.endsWith(',') ||
      trimmedEnd.endsWith("'") ||
      trimmedEnd.endsWith('}')
    ) {
      replacement = `{${trimmedEnd}${trimmedEnd.endsWith(',') ? '' : ','}\n${entryLine(
        innerIndent
      )}\n${closeIndent}}`;
    } else {
      // e.g. a trailing comment inside the object — do not guess.
      return {
        changed: false,
        manualStep: manualInstruction(
          name,
          'the host remotes object ends in a pattern this tool will not guess'
        ),
      };
    }
    const after =
      source.slice(0, valueStart) + replacement + source.slice(inner.close + 1);
    return { changed: true, after };
  }

  const nameProp = props.find((p) => p.name === 'name');
  if (!nameProp) {
    return {
      changed: false,
      manualStep: manualInstruction(
        name,
        'the plugin options object has neither a remotes nor a name property to anchor on'
      ),
    };
  }

  let valueStart = nameProp.colon + 1;
  while (valueStart < source.length && /\s/.test(masked[valueStart]))
    valueStart++;
  const nameValue = readQuoted(source, valueStart);
  if (!nameValue) {
    return {
      changed: false,
      manualStep: manualInstruction(
        name,
        'the plugin name property is not a plain string literal'
      ),
    };
  }

  const nameIndent = indentOfLine(source, nameProp.tokenStart);
  const innerIndent = `${nameIndent}  `;
  const remotesBlock = `remotes: {\n${entryLine(innerIndent)}\n${nameIndent}}`;
  let afterComma = nameValue.end;
  while (afterComma < source.length && /[ \t]/.test(source[afterComma]))
    afterComma++;
  if (source[afterComma] === ',') {
    const insertAt = afterComma + 1;
    return {
      changed: true,
      after: `${source.slice(0, insertAt)}\n${nameIndent}${remotesBlock}${source.slice(insertAt)}`,
    };
  }
  if (masked[afterComma] === '}' || masked[afterComma] === ')') {
    return {
      changed: true,
      after: `${source.slice(0, nameValue.end)},\n${nameIndent}${remotesBlock}${source.slice(nameValue.end)}`,
    };
  }
  return {
    changed: false,
    manualStep: manualInstruction(
      name,
      'the plugin name property ends in a pattern this tool will not guess'
    ),
  };
}
