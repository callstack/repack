import { EventEmitter } from 'node:events';
import { RunnerConsole } from '../runnerConsole.js';

/** Recording Writable stand-in — write() returns real backpressure values. */
class FakeStream extends EventEmitter {
  chunks: string[] = [];
  writeResult = true;
  isTTY?: boolean = true;
  columns = 80;
  write(chunk: string): boolean {
    this.chunks.push(chunk);
    return this.writeResult;
  }
  get output(): string {
    return this.chunks.join('');
  }
}

describe('RunnerConsole sink core (5a)', () => {
  let stream: FakeStream;
  let stdoutWriteBefore: unknown;

  beforeEach(() => {
    stream = new FakeStream();
    stdoutWriteBefore = process.stdout.write;
  });

  afterEach(() => {
    // No global patch may survive — and none may ever be installed.
    expect(process.stdout.write).toBe(stdoutWriteBefore);
  });

  it('writes append-only newline-terminated lines and reports real backpressure', () => {
    const console0 = new RunnerConsole({ stdout: stream });
    expect(console0.log('[host] ready')).toBe(true);
    stream.writeResult = false;
    expect(console0.log('[host] busy')).toBe(false);
    expect(stream.output).toBe('[host] ready\n[host] busy\n');
    expect(process.stdout.write).toBe(stdoutWriteBefore);
  });

  it('never writes to process.stdout — the injected sink is the only outlet', () => {
    const spy = jest.spyOn(process.stdout, 'write');
    const console0 = new RunnerConsole({ stdout: stream });
    console0.log('routed');
    console0.persist(['plan', 'rows']);
    expect(stream.output).toContain('routed');
    expect(stream.output).toContain('plan\nrows\n');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('persists static blocks that stay untouched by later output', () => {
    const console0 = new RunnerConsole({ stdout: stream });
    console0.persist(['PLAN', ' host  8081']);
    const persisted = stream.chunks.length;
    console0.log('[host] compiling');
    // The persisted block is NOT rewritten, redrawn or erased: later lines
    // only ever append after it.
    expect(stream.chunks.slice(0, persisted)).toEqual([
      'PLAN\n',
      ' host  8081\n',
    ]);
    expect(stream.output.endsWith('[host] compiling\n')).toBe(true);
  });

  it('non-TTY mode emits zero cursor escape codes across the whole surface', () => {
    stream.isTTY = undefined;
    const console0 = new RunnerConsole({ stdout: stream });
    console0.log('log line');
    console0.setStatus(['host running']);
    console0.persist(['help']);
    console0.armKeymap({ q: () => undefined });
    console0.onResize(() => undefined);
    console0.release();
    expect(stream.output).toBe('log line\nhost running\nhelp\n');
    expect(stream.output).not.toMatch(/\u001b\[/);
  });
});

/** Complete ANSI strip incl. 256-color/truecolor — the D5 row-B discipline. */
const stripAnsi = (value: string) =>
  value.replace(
    /[\u001B\u009B][[\]()#;?]*(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~])/g,
    ''
  );

const ERASE_ROW_UP = '\x1b[1A\x1b[2K';

class FakeStdin extends EventEmitter {
  isTTY = true;
  setRawMode = jest.fn();
  ref = jest.fn();
  unref = jest.fn();
}

describe('RunnerConsole live status block (5b, D5)', () => {
  let stream: FakeStream;
  let stdin: FakeStdin;

  beforeEach(() => {
    jest.useFakeTimers();
    stream = new FakeStream();
    stdin = new FakeStdin();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const make = () => new RunnerConsole({ stdout: stream, stdin });

  it('paints the owned block once and redraws only with cursorUp+eraseLine', () => {
    const console0 = make();
    console0.setStatus(['host  8081  running']);
    expect(stream.output).toBe('host  8081  running\n');

    console0.setStatus(['host  8081  failed']);
    // Coalesced window: still no repaint inside ~60 ms.
    expect(stream.output).toBe('host  8081  running\n');
    jest.advanceTimersByTime(60);
    expect(stream.output).toBe(
      'host  8081  running\n' + ERASE_ROW_UP + 'host  8081  failed\n'
    );
    // Forbidden legacy mechanisms (D5 row A): no move-down, no clear-down.
    expect(stream.output).not.toContain('\x1b[1B');
    expect(stream.output).not.toContain('\x1b[J');
  });

  it('erases exactly H rows for an H-row block', () => {
    const console0 = make();
    console0.setStatus(['row one', 'row two']);
    console0.setStatus(['row one!', 'row two!']);
    jest.advanceTimersByTime(60);
    expect(stream.output).toBe(
      'row one\nrow two\n' +
        ERASE_ROW_UP +
        ERASE_ROW_UP +
        'row one!\nrow two!\n'
    );
  });

  it('never repaints unchanged content while log lines lift and re-drop the block', () => {
    const console0 = make();
    console0.setStatus(['host  running']);
    const afterPaint = stream.chunks.length;
    console0.setStatus(['host  running']);
    jest.advanceTimersByTime(1000);
    expect(stream.chunks).toHaveLength(afterPaint);

    // A log line while the block is visible: the block is lifted (erased),
    // the line appended, the block re-dropped below — the invariant is that
    // the owned block is always the last thing on screen.
    console0.log('[host] compiled main.js');
    expect(stream.output).toBe(
      'host  running\n' +
        ERASE_ROW_UP +
        '[host] compiled main.js\n' +
        'host  running\n'
    );
  });

  it('counts 256/truecolor escapes as zero width and clamps visible rows to columns-1', () => {
    stream.columns = 40;
    const console0 = make();
    // 39 visible chars wrapped in 256-color + truecolor escapes: fits, kept verbatim.
    const fits =
      '\x1b[38;5;208m' +
      'x'.repeat(20) +
      '\x1b[0m' +
      '\x1b[38;2;10;20;30m' +
      'y'.repeat(19) +
      '\x1b[0m';
    console0.setStatus([fits]);
    expect(stream.output).toBe(`${fits}\n`);

    stream.chunks = [];
    const tooLong = 'z'.repeat(100);
    console0.setStatus([tooLong]);
    const painted = stream.output.replace(/\n$/, '');
    expect(stripAnsi(painted).length).toBeLessThanOrEqual(39);
  });

  it('resize repaints the owned block immediately', () => {
    const console0 = make();
    console0.setStatus(['host  running']);
    const before = stream.chunks.length;
    stream.columns = 120;
    stream.emit('resize');
    expect(stream.chunks.length).toBeGreaterThan(before);
    expect(stream.chunks[before]).toBe(ERASE_ROW_UP);
    expect(stream.output.endsWith('host  running\n')).toBe(true);
  });

  it('raw mode is on only while armed and release is idempotent', () => {
    const console0 = make();
    expect(stdin.setRawMode).not.toHaveBeenCalled();
    console0.armKeymap({ q: () => undefined });
    expect(stdin.setRawMode).toHaveBeenCalledTimes(1);
    expect(stdin.setRawMode).toHaveBeenCalledWith(true);
    console0.release();
    console0.release();
    expect(stdin.setRawMode).toHaveBeenCalledTimes(2);
    expect(stdin.setRawMode).toHaveBeenLastCalledWith(false);
    // Re-arm then release again: one more restore, no extra calls.
    const qSpy = jest.fn();
    console0.armKeymap({ q: qSpy });
    stdin.setRawMode.mockClear();
    console0.release();
    expect(stdin.setRawMode).toHaveBeenCalledTimes(1);
    expect(stdin.setRawMode).toHaveBeenCalledWith(false);
  });

  it('keymap handles the mapped keys; every other key triggers nothing', () => {
    const console0 = make();
    const q = jest.fn();
    const d = jest.fn();
    const ctrlC = jest.fn();
    const other = jest.fn();
    console0.armKeymap({ q, d, '\u0003': ctrlC, z: other });
    stdin.emit('data', Buffer.from('z'));
    expect(other).toHaveBeenCalledTimes(1);
    stdin.emit('data', Buffer.from('?'));
    stdin.emit('data', Buffer.from('\u001b[A'));
    expect(q).not.toHaveBeenCalled();
    expect(d).not.toHaveBeenCalled();
    expect(ctrlC).not.toHaveBeenCalled();
    stdin.emit('data', Buffer.from('q'));
    expect(q).toHaveBeenCalledTimes(1);
    stdin.emit('data', Buffer.from('d'));
    expect(d).toHaveBeenCalledTimes(1);
    stdin.emit('data', Buffer.from('\u0003'));
    expect(ctrlC).toHaveBeenCalledTimes(1);
  });

  it('pending repaints are dropped on release and never written after', () => {
    const console0 = make();
    console0.setStatus(['host  running']);
    console0.setStatus(['host  failed']);
    console0.release();
    stream.chunks = [];
    jest.advanceTimersByTime(500);
    expect(stream.output).toBe('');
  });
});
