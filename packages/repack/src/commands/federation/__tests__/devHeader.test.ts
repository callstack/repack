import { logoStr } from '../../common/logo.js';
import { devHeader } from '../devHeader.js';

/** Same complete ANSI strip the runner console uses. */
const stripAnsi = (text: string) =>
  text.replace(
    /[\u001B\u009B][[\]()#;?]*(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~])/g,
    ''
  );

const DESCRIPTION =
  'one supervised session for your module-federation workspace';

/**
 * chalk@4 — gradient-string's color backend — fixes its color level at
 * require time. Load the whole chain fresh with FORCE_COLOR so the color
 * branch really colorizes, exactly like on a developer TTY.
 */
const loadHeaderColored = () => {
  const previous = process.env.FORCE_COLOR;
  process.env.FORCE_COLOR = '3';
  try {
    let header: typeof import('../devHeader.js') | undefined;
    jest.isolateModules(() => {
      header = require('../devHeader.js');
    });
    if (!header) throw new Error('devHeader module did not load');
    return header.devHeader;
  } finally {
    if (previous === undefined) delete process.env.FORCE_COLOR;
    else process.env.FORCE_COLOR = previous;
  }
};

describe('devHeader', () => {
  it('names the version and the one-line description in both modes', () => {
    for (const colors of [true, false]) {
      const header = devHeader('9.8.7', { colors });
      expect(header).toContain('9.8.7');
      expect(header).toContain(DESCRIPTION);
    }
  });

  it('color mode reuses the shared gradient ASCII art', () => {
    const header = loadHeaderColored()('9.8.7', { colors: true });
    // The exact art logo.ts renders, glyph-graded one char at a time under
    // the gradient — shared source, not a copy (strip ANSI to see it).
    expect(stripAnsi(header)).toContain(logoStr.trim());
    // Gradient output is ANSI: at least one ESC sequence.
    expect(header).toContain('\u001b');
  });

  it('plain mode is free of ANSI escape bytes', () => {
    const header = devHeader('9.8.7', { colors: false });
    expect(header).not.toContain('\u001b');
    expect(header).toContain('Re.Pack');
    expect(header).toContain('v9.8.7');
  });
});
