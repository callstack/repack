import type { WriteStream } from 'node:tty';

/** The one stdout shape the console writes to. */
export type ConsoleStream = Pick<WriteStream, 'write'> & {
  isTTY?: boolean;
  columns?: number;
  on?: (event: string, listener: () => void) => unknown;
  off?: (event: string, listener: () => void) => unknown;
};

/** The stdin shape the keymap needs (a `tty.ReadStream` in production). */
export type StdinStream = {
  isTTY?: boolean;
  setRawMode?: (mode: boolean) => unknown;
  on?: (event: string, listener: (chunk: Buffer) => void) => unknown;
  off?: (event: string, listener: (chunk: Buffer) => void) => unknown;
};

/**
 * Complete ANSI strip — includes 256-color (`38;5;…`) and truecolor
 * (`38;2;…;…;…`) SGRs the legacy `terminal.ts` regex misses, which is
 * exactly where its cursor-up off-by-N ghosts came from (D5 row B).
 */
const ANSI_PATTERN =
  /[\u001B\u009B][[\]()#;?]*(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~])/g;

/** Up one line + erase it — the ONLY redraw primitive of the owned block. */
const ERASE_ROW_UP = '\u001b[1A\u001b[2K';

/** Status repaint coalescing window (D5 row E). */
const COALESCE_MS = 60;

const sameRows = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((row, index) => row === b[index]);

/**
 * The single stdout owner of a federation-dev session (D5).
 *
 * Ownership discipline, pinned by tests:
 * - `process.stdout.write` is NEVER monkey-patched: every producer calls
 *   this object (`log` for live lines, `persist` for static blocks, child
 *   pipe chunks routed through `log`).
 * - Writes are append-only and `\n`-terminated; `log`/`persist` report the
 *   real backpressure (`write` return value), never a lie.
 * - Non-TTY (CI, `--no-interactive` pipes) is plain mode: zero cursor
 *   escape codes, no prompts, no keymap.
 * - The status block is a fixed H-row owned region redrawn exclusively
 *   with `ERASE_ROW_UP` repeats — never `moveCursor` down, never
 *   `clearScreenDown` (D5 row A). Rows are width-clamped by ANSI-stripped
 *   length to `columns - 1` so the redraw math is exact (D5 row B).
 *   Repaints are coalesced to ~60 ms and only on content change; log lines
 *   stream immediately with the block lifted and re-dropped below them, so
 *   the block is always the last thing on screen.
 * - Raw mode is on only while the session keymap is armed; `release()`
 *   restores it idempotently, and the command adds `process.on('exit')` +
 *   `finally` coverage for every other exit path.
 */
export class RunnerConsole {
  private stream: ConsoleStream;
  private stdin: StdinStream | undefined;
  private resizeListeners: Array<() => void> = [];
  private onResizeEvent = () => {
    // A resize invalidates the width math: repaint the owned block now.
    if (this.repaintTimer !== null) {
      clearTimeout(this.repaintTimer);
      this.repaintTimer = null;
      this.pending = null;
    }
    if (this.visible !== null) this.paintNow(this.visible);
    for (const listener of this.resizeListeners) listener();
  };
  /** Rows currently occupying the screen bottom, or null when no block. */
  private visible: string[] | null = null;
  /** Newest rows waiting for the coalescing window, or null. */
  private pending: string[] | null = null;
  private repaintTimer: ReturnType<typeof setTimeout> | null = null;
  private keyListener: ((chunk: Buffer) => void) | null = null;

  constructor(options: { stdout: ConsoleStream; stdin?: StdinStream }) {
    this.stream = options.stdout;
    this.stdin = options.stdin;
    if (typeof this.stream.on === 'function') {
      this.stream.on('resize', this.onResizeEvent);
    }
  }

  private get isTTY(): boolean {
    return this.stream.isTTY === true;
  }

  private clampWidth(row: string): string {
    const max = (this.stream.columns ?? 80) - 1;
    const stripped = row.replace(ANSI_PATTERN, '');
    // Only over-wide rows lose their styling — clamping a styled row
    // mid-escape would leak sequences into text.
    return stripped.length > max ? stripped.slice(0, max) : row;
  }

  private eraseBlock(): void {
    if (this.visible !== null) {
      this.stream.write(ERASE_ROW_UP.repeat(this.visible.length));
    }
  }

  private dropBlock(): void {
    if (this.visible !== null) {
      this.stream.write(`${this.visible.join('\n')}\n`);
    }
  }

  private paintNow(rows: string[]): void {
    this.eraseBlock();
    this.stream.write(`${rows.join('\n')}\n`);
    this.visible = rows;
  }

  /** Append one live line (child logs ride this prefixed). Returns backpressure. */
  log(line: string): boolean {
    if (this.isTTY && this.visible !== null) {
      this.eraseBlock();
      const written = this.stream.write(`${line}\n`);
      // The owned block must always be the last thing on screen.
      this.dropBlock();
      return written;
    }
    return this.stream.write(`${line}\n`);
  }

  /** Print a static block (plan table, help, guidance): written once, never redrawn. */
  persist(lines: string[]): void {
    for (const line of lines) this.log(line);
  }

  /**
   * Update the owned status rows. First paint is immediate; later changes
   * coalesce to one repaint per ~60 ms and only when the content actually
   * changed (D5 row E). Non-TTY stays plain and immediate.
   */
  setStatus(rows: string[]): void {
    if (!this.isTTY) {
      for (const row of rows) this.stream.write(`${row}\n`);
      return;
    }
    const clamped = rows.map((row) => this.clampWidth(row));
    if (this.visible === null) {
      this.paintNow(clamped);
      return;
    }
    if (sameRows(clamped, this.pending ?? this.visible)) return;
    this.pending = clamped;
    if (this.repaintTimer === null) {
      this.repaintTimer = setTimeout(() => {
        this.repaintTimer = null;
        const next = this.pending;
        this.pending = null;
        if (next !== null && !sameRows(next, this.visible ?? [])) {
          this.paintNow(next);
        }
      }, COALESCE_MS);
    }
  }

  /** Arm the session keymap (raw mode with guaranteed restore). Non-TTY: documented no-op. */
  armKeymap(map: Record<string, () => void>): void {
    const stdin = this.stdin;
    if (
      !this.isTTY ||
      !stdin ||
      stdin.isTTY !== true ||
      typeof stdin.on !== 'function'
    ) {
      return;
    }
    this.disarmKeymap();
    stdin.setRawMode?.(true);
    const listener = (chunk: Buffer) => {
      // Exactly the mapped keys do something; everything else is a
      // deliberate no-op the persisted help line discloses (D5 row F).
      map[chunk.toString()]?.();
    };
    this.keyListener = listener;
    stdin.on('data', listener);
  }

  private disarmKeymap(): void {
    if (this.keyListener !== null && this.stdin) {
      this.stdin.off?.('data', this.keyListener);
      this.keyListener = null;
      this.stdin.setRawMode?.(false);
    }
  }

  /** Register a repaint hook fired on stdout 'resize'. */
  onResize(fn: () => void): void {
    this.resizeListeners.push(fn);
  }

  /**
   * Restore terminal state. Idempotent; the command also registers it on
   * `process.on('exit')` and a `finally`, covering every exit path without
   * the ESM-only `exit-hook` import a CJS build cannot require.
   */
  release(): void {
    if (typeof this.stream.off === 'function') {
      this.stream.off('resize', this.onResizeEvent);
    }
    this.resizeListeners = [];
    if (this.repaintTimer !== null) {
      clearTimeout(this.repaintTimer);
      this.repaintTimer = null;
    }
    this.pending = null;
    // The block on screen becomes static history: no erase accounting and
    // no re-drop of output persisted after the release.
    this.visible = null;
    this.disarmKeymap();
  }
}
