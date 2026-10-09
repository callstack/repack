import { diffLines, formatFileDiff } from '../init/diff.js';

describe('diffLines — LCS correctness', () => {
  it('reports pure appends', () => {
    expect(diffLines('a\nb', 'a\nb\nc')).toEqual([
      { kind: 'context', text: 'a' },
      { kind: 'context', text: 'b' },
      { kind: 'add', text: 'c' },
    ]);
  });

  it('reports pure removals', () => {
    expect(diffLines('a\nb\nc', 'a\nc')).toEqual([
      { kind: 'context', text: 'a' },
      { kind: 'remove', text: 'b' },
      { kind: 'context', text: 'c' },
    ]);
  });

  it('reports a replacement as remove followed by add', () => {
    expect(diffLines('a\nx\nc', 'a\ny\nc')).toEqual([
      { kind: 'context', text: 'a' },
      { kind: 'remove', text: 'x' },
      { kind: 'add', text: 'y' },
      { kind: 'context', text: 'c' },
    ]);
  });

  it('keeps LCS alignment on an interleaved case', () => {
    const lines = diffLines('a\nb\nc\nd', 'b\nc\ne\nd');
    expect(lines).toEqual([
      { kind: 'remove', text: 'a' },
      { kind: 'context', text: 'b' },
      { kind: 'context', text: 'c' },
      { kind: 'add', text: 'e' },
      { kind: 'context', text: 'd' },
    ]);
    // Reconstruction contract: contexts+adds rebuild b; contexts+removes rebuild a.
    expect(
      lines
        .filter((l) => l.kind !== 'remove')
        .map((l) => l.text)
        .join('\n')
    ).toBe('b\nc\ne\nd');
    expect(
      lines
        .filter((l) => l.kind !== 'add')
        .map((l) => l.text)
        .join('\n')
    ).toBe('a\nb\nc\nd');
  });

  it('treats identical content as all context', () => {
    expect(
      diffLines('same\ncontent', 'same\ncontent').every(
        (l) => l.kind === 'context'
      )
    ).toBe(true);
  });
});

describe('formatFileDiff', () => {
  it('renders new files as full content with a (new file) header', () => {
    const rendered = formatFileDiff('remote/rspack.store.mts', null, 'a\nb');
    expect(rendered).toContain('(new file)');
    expect(rendered).toContain('remote/rspack.store.mts');
    expect(rendered).toContain('a');
    expect(rendered).toContain('b');
  });

  it('renders modified files with - / + prefixes', () => {
    const rendered = formatFileDiff('package.json', 'a\nold\nc', 'a\nnew\nc');
    expect(rendered).toContain('- old');
    expect(rendered).toContain('+ new');
  });

  it('trims unchanged runs beyond three context lines', () => {
    const before = Array.from({ length: 30 }, (_, i) => `line${i}`).join('\n');
    const after = before.replace('line15', 'CHANGED');
    const rendered = formatFileDiff('big.txt', before, after);
    expect(rendered).toContain('+ CHANGED');
    expect(rendered).toContain('line12');
    expect(rendered).toContain('line18');
    expect(rendered).not.toContain('line2');
    expect(rendered).not.toContain('line25');
  });
});
