import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import execa from 'execa';
import type { PlannedApp } from './devPlan.js';
import { classifyDeadChild } from './portPlanner.js';

/** Where prefixed child log lines go — the runner's sink (D5). */
export interface LogSink {
  log(line: string): void;
}

/** Returns the `GET /status` body, or null when nothing answered. */
export type StatusProbe = (url: string) => Promise<string | null>;

export type AppStatus = 'starting' | 'running' | 'failed' | 'exited';

export interface SessionResult {
  exitCode: 0 | 1;
  apps: Record<
    string,
    { status: 'running' | 'failed' | 'exited'; code?: number }
  >;
}

/** A one-shot attached process in the same spawn shape as a planned app. */
export interface OneShotTarget {
  file: string;
  args: string[];
  cwd: string;
}

interface OneShotChild {
  name: string;
  child: ChildProcessWithoutNullStreams;
  exited: boolean;
  /** Set when the supervisor kills it at session end: exit stays silent. */
  killed: boolean;
  pending: { out: string; err: string };
}

const DEFAULT_GRACE_MS = 5000;
const READINESS_POLL_FIRST_MS = 500;
const READINESS_POLL_MAX_MS = 2000;

interface TrackedChild {
  app: PlannedApp;
  child: ChildProcessWithoutNullStreams;
  status: AppStatus;
  exitCode: number | null;
  /** Set by the exit handler — the one liveness truth for signals. */
  exited: boolean;
  /** Bytes of a line split across pipe chunks. */
  pending: { out: string; err: string };
  pollTimer?: ReturnType<typeof setTimeout>;
}

/**
 * Child-per-app supervisor on execa@^5 (v5 API only). One process per app
 * gives crash isolation and real RSS reclamation; every child runs with
 * `--no-interactive` and piped stdio, so the supervisor is the sole owner
 * of stdin and signals, and the only writer of the session's stdout is the
 * sink it logs into.
 */
export class DevSupervisor {
  private tracked: TrackedChild[] = [];
  private oneShots: OneShotChild[] = [];
  private shutdownReason: 'interrupt' | null = null;
  private escalated = false;
  private graceTimer?: ReturnType<typeof setTimeout>;
  private sessionFailed = false;
  private allGone!: Promise<void>;
  private markAllGone!: () => void;

  constructor(
    private plan: PlannedApp[],
    private out: LogSink,
    private opts: {
      graceMs?: number;
      probeStatus: StatusProbe;
      /** Fires once per app the first time its probe reports running. */
      onFirstReady?: (appName: string) => void;
    }
  ) {
    this.allGone = new Promise<void>((resolve) => {
      this.markAllGone = resolve;
    });
  }

  /** Current per-app health, exactly as the status table renders it. */
  getStatuses(): Record<string, AppStatus> {
    return Object.fromEntries(
      this.tracked.map((entry) => [entry.app.name, entry.status])
    );
  }

  /**
   * Attach a one-shot child (the app launch) to the session: spawned with
   * the same execa discipline as the dev-server children, streamed through
   * the same prefixed log pane, and killed with the children on shutdown or
   * session end. It is deliberately NOT tracked: it has no port to watch,
   * no status row, and its exit code never touches the session result.
   */
  spawnOneShot(target: OneShotTarget, name = 'launch'): void {
    const child = execa(target.file, target.args, {
      cwd: target.cwd,
      stdin: 'ignore',
      stdout: 'pipe',
      stderr: 'pipe',
    }) as unknown as ChildProcessWithoutNullStreams;
    const asPromise = child as unknown as Partial<Promise<unknown>>;
    if (typeof asPromise.catch === 'function') asPromise.catch(() => undefined);
    const entry: OneShotChild = {
      name,
      child,
      exited: false,
      killed: false,
      pending: { out: '', err: '' },
    };
    this.oneShots.push(entry);
    child.stdout?.on('data', (chunk: Buffer) =>
      this.streamPrefixed(name, entry.pending, 'out', chunk)
    );
    child.stderr?.on('data', (chunk: Buffer) =>
      this.streamPrefixed(name, entry.pending, 'err', chunk)
    );
    child.once('exit', (code, signal) =>
      this.onOneShotExit(entry, code, signal)
    );
  }

  private onOneShotExit(
    entry: OneShotChild,
    code: number | null,
    signal: string | null
  ): void {
    if (entry.exited) return;
    entry.exited = true;
    this.flushPending(entry.name, entry.pending);
    // Shutdown/end-of-session kills are the supervisor's own doing: silent.
    if (this.shutdownReason !== null || entry.killed) return;
    if (code === 0) {
      this.out.log(`[${entry.name}] App launched`);
    } else {
      this.out.log(
        `[${entry.name}] exited with code ${code ?? `signal ${signal}`}`
      );
    }
  }

  /** Spawn every app (host first, remotes in plan order) and live until they are gone. */
  async run(): Promise<SessionResult> {
    for (const app of this.plan) {
      const child = execa(app.spawn.file, app.spawn.args, {
        cwd: app.spawn.cwd,
        stdin: 'ignore',
        stdout: 'pipe',
        stderr: 'pipe',
      }) as unknown as ChildProcessWithoutNullStreams;
      // The v5 child is also a promise; failures surface through the
      // exit/error events this class drives — never as unhandled rejections.
      const asPromise = child as unknown as Partial<Promise<unknown>>;
      if (typeof asPromise.catch === 'function')
        asPromise.catch(() => undefined);
      const entry: TrackedChild = {
        app,
        child,
        status: 'starting',
        exitCode: null,
        exited: false,
        pending: { out: '', err: '' },
      };
      this.tracked.push(entry);
      child.stdout?.on('data', (chunk: Buffer) =>
        this.onChunk(entry, 'out', chunk)
      );
      child.stderr?.on('data', (chunk: Buffer) =>
        this.onChunk(entry, 'err', chunk)
      );
      child.once('exit', (code, signal) => this.onExit(entry, code, signal));
      this.pollReadiness(entry);
    }

    await this.allGone;
    // Session over: a launch still in flight goes with it, silently — its
    // story already ended with the servers, and a kill-code line after the
    // final table would read like a crash.
    for (const one of this.oneShots) {
      if (!one.exited) {
        one.killed = true;
        one.child.kill('SIGTERM');
      }
    }
    const apps: SessionResult['apps'] = {};
    for (const entry of this.tracked) {
      const status =
        entry.status === 'starting' || entry.status === 'running'
          ? entry.status === 'running'
            ? 'running'
            : 'exited'
          : entry.status;
      apps[entry.app.name] = {
        status,
        ...(entry.exitCode === null ? {} : { code: entry.exitCode }),
      };
    }
    return { exitCode: this.sessionFailed ? 1 : 0, apps };
  }

  /**
   * Ordered shutdown: SIGINT to every live child → grace window → SIGTERM
   * to survivors. A second interrupt escalates to SIGTERM-all immediately
   * (threat row "Signals & terminal state"). `run()` resolves only after
   * every child is gone — never orphaning a dev server.
   */
  shutdown(reason: 'interrupt'): void {
    if (this.shutdownReason === null) {
      this.shutdownReason = reason;
      for (const entry of this.tracked) {
        if (!this.isGone(entry)) entry.child.kill('SIGINT');
      }
      for (const one of this.oneShots) {
        if (!one.exited) one.child.kill('SIGINT');
      }
      this.graceTimer = setTimeout(
        () => this.escalate(),
        this.opts.graceMs ?? DEFAULT_GRACE_MS
      );
      return;
    }
    if (reason === 'interrupt' && !this.escalated) this.escalate();
  }

  private escalate(): void {
    this.escalated = true;
    if (this.graceTimer) clearTimeout(this.graceTimer);
    for (const entry of this.tracked) {
      if (!this.isGone(entry)) entry.child.kill('SIGTERM');
    }
    for (const one of this.oneShots) {
      if (!one.exited) one.child.kill('SIGTERM');
    }
  }

  private isGone(entry: TrackedChild): boolean {
    return entry.exited;
  }

  private onChunk(entry: TrackedChild, stream: 'out' | 'err', chunk: Buffer) {
    this.streamPrefixed(entry.app.name, entry.pending, stream, chunk);
  }

  /**
   * Line-split on \n across chunks; the content passes through UNALTERED
   * (ANSI included) — the prefix is the only addition. Shared by tracked
   * apps and one-shot children: one log pane, one discipline.
   */
  private streamPrefixed(
    name: string,
    pending: { out: string; err: string },
    stream: 'out' | 'err',
    chunk: Buffer
  ): void {
    const text = pending[stream] + chunk.toString();
    const lines = text.split('\n');
    pending[stream] = lines.pop() ?? '';
    for (const line of lines) {
      this.out.log(`[${name}] ${line}`);
    }
  }

  private flushPending(
    name: string,
    pending: { out: string; err: string }
  ): void {
    for (const stream of ['out', 'err'] as const) {
      const rest = pending[stream];
      if (rest !== '') {
        pending[stream] = '';
        this.out.log(`[${name}] ${rest}`);
      }
    }
  }

  private onExit(
    entry: TrackedChild,
    code: number | null,
    signal: string | null
  ) {
    if (entry.exited) return;
    entry.exited = true;
    if (entry.pollTimer) clearTimeout(entry.pollTimer);
    entry.exitCode = code;
    this.flushPending(entry.app.name, entry.pending);

    if (this.shutdownReason !== null) {
      entry.status = 'exited';
    } else if (code === 0) {
      entry.status = 'exited';
    } else {
      entry.status = 'failed';
      this.sessionFailed = true;
      this.out.log(
        `[${entry.app.name}] exited with code ${code ?? `signal ${signal}`}`
      );
      // TOCTOU: a dead child whose port still answers /status lost it to
      // another process between probe and spawn — name it precisely.
      void this.classifyCrash(entry);
    }
    if (this.tracked.every((e) => this.isGone(e))) this.markAllGone();
  }

  private async classifyCrash(entry: TrackedChild) {
    if (entry.app.port === undefined) return;
    const body = await this.opts.probeStatus(entry.app.url);
    const verdict = classifyDeadChild(
      entry.app.name,
      entry.app.port,
      body !== null
    );
    if (verdict.kind === 'address-in-use') {
      this.out.log(`[${entry.app.name}] ${verdict.message}`);
    }
  }

  private pollReadiness(entry: TrackedChild) {
    const schedule = (delay: number) => {
      entry.pollTimer = setTimeout(() => void tick(delay), delay);
    };
    const tick = async (delay: number) => {
      if (this.isGone(entry) || entry.status === 'running') return;
      const body = await this.opts.probeStatus(entry.app.url);
      if (this.isGone(entry)) return;
      if (body?.startsWith('packager-status:running')) {
        entry.status = 'running';
        this.opts.onFirstReady?.(entry.app.name);
        return;
      }
      schedule(Math.min(delay * 2, READINESS_POLL_MAX_MS));
    };
    schedule(READINESS_POLL_FIRST_MS);
  }
}
