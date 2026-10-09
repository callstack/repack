/**
 * Hand-rolled LCS line diff for the `federation-init` diff-before-write
 * gate. Output is for humans reading a terminal, not for `git apply`.
 */

export type DiffLineKind = 'context' | 'add' | 'remove';

export interface DiffLine {
  kind: DiffLineKind;
  text: string;
}

/** Classic LCS diff over lines — small files, no Myers needed. */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split('\n');
  const b = after.split('\n');
  // lengths[n][...] table, built bottom-up
  const lengths: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0)
  );
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lengths[i][j] =
        a[i] === b[j]
          ? lengths[i + 1][j + 1] + 1
          : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    }
  }

  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      lines.push({ kind: 'context', text: a[i] });
      i++;
      j++;
    } else if (lengths[i + 1][j] >= lengths[i][j + 1]) {
      lines.push({ kind: 'remove', text: a[i++] });
    } else {
      lines.push({ kind: 'add', text: b[j++] });
    }
  }
  while (i < a.length) lines.push({ kind: 'remove', text: a[i++] });
  while (j < b.length) lines.push({ kind: 'add', text: b[j++] });
  return lines;
}

const CONTEXT_LINES = 3;

/** Render changed runs with up to 3 context lines, unified-style. */
export function formatDiffBody(
  lines: DiffLine[],
  fromNewFile: boolean
): string {
  const prefix: Record<DiffLineKind, string> = {
    context: '  ',
    add: fromNewFile ? '  ' : '+ ',
    remove: '- ',
  };

  let body: string;
  if (fromNewFile) {
    body = lines.map((line) => `${prefix[line.kind]}${line.text}`).join('\n');
  } else {
    const keep = new Array<boolean>(lines.length).fill(false);
    lines.forEach((line, index) => {
      if (line.kind === 'context') return;
      for (
        let k = Math.max(0, index - CONTEXT_LINES);
        k <= Math.min(lines.length - 1, index + CONTEXT_LINES);
        k++
      ) {
        keep[k] = true;
      }
    });
    body = lines
      .filter((_, index) => keep[index])
      .map((line) => `${prefix[line.kind]}${line.text}`)
      .join('\n');
  }
  return body;
}

/**
 * Render one planned file write as a human-readable diff. New files show
 * their full content under a `(new file)` header; modified files show only
 * the changed runs.
 */
export function formatFileDiff(
  displayPath: string,
  before: string | null,
  after: string
): string {
  if (before === null) {
    return (
      `+++ ${displayPath} (new file)\n` +
      after
        .split('\n')
        .map((text) => `  ${text}`)
        .join('\n')
    );
  }
  const lines = diffLines(before, after);
  if (lines.every((line) => line.kind === 'context')) {
    return `--- ${displayPath} (no changes)`;
  }
  return `--- ${displayPath}\n${formatDiffBody(lines, false)}`;
}
