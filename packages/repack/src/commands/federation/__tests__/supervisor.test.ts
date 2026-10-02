import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import execa from 'execa';
import type { PlannedApp } from '../devPlan.js';
import type { LogSink } from '../supervisor.js';
import { DevSupervisor } from '../supervisor.js';

jest.mock('execa');
const execaMock = execa as jest.MockedFunction<typeof execa>;

class FakeChild extends EventEmitter {
  stdout = new PassThrough();
  stderr = new PassThrough();
  kill = jest.fn();
}

const planned = (name: string, port: number): PlannedApp => ({
  name,
  role: name === 'host' ? 'host' : 'remote',
  root: `/workspace/${name}`,
  bundler: 'rspack',
  port,
  url: `http://localhost:${port}`,
  spawn: {
    file: process.execPath,
    args: ['/rn/cli.js', 'start', '--no-interactive'],
    cwd: `/workspace/${name}`,
  },
  commandLine: 'node /rn/cli.js start',
});

const plan = [planned('host', 8081), planned('MiniApp', 8082)];

let children: FakeChild[] = [];
let lines: string[] = [];
let sink: LogSink;
let probeStatus: jest.Mock;
let supervisors: DevSupervisor[] = [];

beforeEach(() => {
  children = [];
  lines = [];
  supervisors = [];
  sink = { log: (line: string) => lines.push(line) };
  probeStatus = jest.fn(async () => null);
  execaMock.mockImplementation(((_options: unknown) => {
    const child = new FakeChild();
    children.push(child);
    return child;
  }) as unknown as typeof execa);
});

afterEach(() => {
  // Park every live session: shutdown + exit so no readiness poller
  // outlives its test (polling stops on child exit).
  for (const supervisor of supervisors) supervisor.shutdown('interrupt');
  for (const child of children) child.emit('exit', 0, null);
  jest.useRealTimers();
});

const makeSupervisor = (opts?: {
  graceMs?: number;
  onFirstReady?: (appName: string) => void;
}) => {
  const supervisor = new DevSupervisor(plan, sink, {
    ...(opts?.graceMs === undefined ? {} : { graceMs: opts.graceMs }),
    ...(opts?.onFirstReady === undefined
      ? {}
      : { onFirstReady: opts.onFirstReady }),
    probeStatus,
  });
  supervisors.push(supervisor);
  return supervisor;
};

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('DevSupervisor spawn discipline', () => {
  it('spawns each app with file/args/cwd, no shell, ignore-stdin and piped stdio', () => {
    const supervisor = makeSupervisor();
    void supervisor.run();
    expect(execaMock).toHaveBeenCalledTimes(2);
    // MockedFunction picks execa's (file, options?) overload; the call this
    // supervisor makes is the (file, args, options) one — view it as such.
    const calls = execaMock.mock.calls as unknown as Array<
      [string, string[], Record<string, unknown>]
    >;
    // Host first, then remotes in plan order.
    expect(calls[0]![1]).toEqual(plan[0]!.spawn.args);
    for (const [index, app] of plan.entries()) {
      const call = calls[index]!;
      expect(call[0]).toBe(process.execPath);
      expect(call[1]).toEqual(app.spawn.args);
      const options = call[2];
      expect(options.cwd).toBe(app.spawn.cwd);
      expect(options.stdin).toBe('ignore');
      expect(options.stdout).toBe('pipe');
      expect(options.stderr).toBe('pipe');
      expect(options.shell).toBeFalsy();
    }
  });

  it('prefixes and line-splits partial chunks keeping ANSI and content intact', async () => {
    const supervisor = makeSupervisor();
    void supervisor.run();
    children[0]!.stdout.write('hello wo');
    children[0]!.stdout.write('rld\n');
    children[0]!.stderr.write('\u001b[31mcompiling\u001b[39m\n');
    await flush();
    expect(lines).toEqual([
      '[host] hello world',
      '[host] \u001b[31mcompiling\u001b[39m',
    ]);
  });
});

describe('DevSupervisor readiness', () => {
  it('marks an app running once probeStatus reports packager-status:running', async () => {
    jest.useFakeTimers();
    probeStatus.mockImplementation(async () => 'packager-status:running');
    const supervisor = makeSupervisor();
    void supervisor.run();
    await jest.advanceTimersByTimeAsync(1000);
    expect(supervisor.getStatuses().host).toBe('running');
    expect(supervisor.getStatuses().MiniApp).toBe('running');
  });

  it('marks a dead child failed, never pending forever', async () => {
    jest.useFakeTimers();
    const supervisor = makeSupervisor();
    const run = supervisor.run();
    children[1]!.emit('exit', 1, null);
    await jest.advanceTimersByTimeAsync(1000);
    expect(supervisor.getStatuses().MiniApp).toBe('failed');
    children[0]!.emit('exit', 0, null);
    const result = await run;
    expect(result.exitCode).toBe(1);
    expect(result.apps.MiniApp.status).toBe('failed');
  });
});

describe('DevSupervisor ordered shutdown', () => {
  it('SIGINTs all children, SIGTERMs survivors after the grace window, resolves exit 0 only once all are gone', async () => {
    jest.useFakeTimers();
    const supervisor = makeSupervisor({ graceMs: 5000 });
    const run = supervisor.run();

    supervisor.shutdown('interrupt');
    expect(children[0]!.kill).toHaveBeenCalledWith('SIGINT');
    expect(children[1]!.kill).toHaveBeenCalledWith('SIGINT');

    // Host is polite, MiniApp ignores SIGINT: after the grace window it
    // gets SIGTERM, and the session stays open until BOTH are gone.
    children[0]!.emit('exit', 0, null);
    let settled = false;
    void run.then(() => {
      settled = true;
    });
    await jest.advanceTimersByTimeAsync(5000);
    expect(children[1]!.kill).toHaveBeenCalledWith('SIGTERM');
    expect(settled).toBe(false);
    children[1]!.emit('exit', 0, null);
    const result = await run;
    expect(result.exitCode).toBe(0);
  });

  it('a second interrupt escalates to SIGTERM-all immediately', async () => {
    jest.useFakeTimers();
    const supervisor = makeSupervisor({ graceMs: 5000 });
    void supervisor.run();
    supervisor.shutdown('interrupt');
    supervisor.shutdown('interrupt');
    expect(children[0]!.kill).toHaveBeenCalledWith('SIGTERM');
    expect(children[1]!.kill).toHaveBeenCalledWith('SIGTERM');
  });
});

describe('DevSupervisor crash isolation', () => {
  it('keeps siblings untouched, names the crashed child + code and fails the session', async () => {
    jest.useFakeTimers();
    const supervisor = makeSupervisor();
    const run = supervisor.run();
    children[1]!.emit('exit', 3, null);
    await jest.advanceTimersByTimeAsync(100);
    // Sibling untouched: no signal reached the host.
    expect(children[0]!.kill).not.toHaveBeenCalled();
    expect(
      lines.some((line) => line.includes('MiniApp') && line.includes('3'))
    ).toBe(true);
    supervisor.shutdown('interrupt');
    children[0]!.emit('exit', 0, null);
    children[1]!.emit('exit', 3, null);
    const result = await run;
    expect(result.exitCode).toBe(1);
  });
});

describe('DevSupervisor first-ready callback', () => {
  it('fires onFirstReady once per app on the first running transition only', async () => {
    jest.useFakeTimers();
    probeStatus.mockImplementation(async () => 'packager-status:running');
    const onFirstReady = jest.fn();
    const supervisor = makeSupervisor({ onFirstReady });
    void supervisor.run();
    await jest.advanceTimersByTimeAsync(1000);
    expect(onFirstReady.mock.calls.map((call) => call[0]).sort()).toEqual([
      'MiniApp',
      'host',
    ]);
    // Later polls never re-fire: readiness flips once and stays flipped.
    await jest.advanceTimersByTimeAsync(5000);
    expect(onFirstReady).toHaveBeenCalledTimes(2);
  });
});

describe('DevSupervisor one-shot attached process', () => {
  const target = {
    file: process.execPath,
    args: ['/rn/cli.js', 'run-android', '--no-packager'],
    cwd: '/workspace/app',
  };

  it('spawns through execa with the supervisor discipline and streams [launch]-prefixed lines outside the status table', async () => {
    const supervisor = makeSupervisor();
    void supervisor.run();
    supervisor.spawnOneShot(target);
    const calls = execaMock.mock.calls as unknown as Array<
      [string, string[], Record<string, unknown>]
    >;
    expect(calls).toHaveLength(3);
    const launchCall = calls[2]!;
    expect(launchCall[0]).toBe(process.execPath);
    expect(launchCall[1]).toEqual(target.args);
    expect(launchCall[2].cwd).toBe(target.cwd);
    expect(launchCall[2].stdin).toBe('ignore');
    expect(launchCall[2].stdout).toBe('pipe');
    expect(launchCall[2].stderr).toBe('pipe');
    expect(launchCall[2].shell).toBeFalsy();
    // Same append-only prefixed log pane, same line-splitting discipline.
    children[2]!.stdout.write('BUILD SUC');
    children[2]!.stdout.write('CESS\n');
    await flush();
    expect(lines).toContain('[launch] BUILD SUCCESS');
    // The status table is untouched: no 'launch' row appears.
    expect(Object.keys(supervisor.getStatuses())).toEqual(['host', 'MiniApp']);
  });

  it('exit 0 persists App launched and never fails the session', async () => {
    const supervisor = makeSupervisor();
    const run = supervisor.run();
    supervisor.spawnOneShot(target);
    children[2]!.emit('exit', 0, null);
    await flush();
    expect(lines).toContain('[launch] App launched');
    supervisor.shutdown('interrupt');
    children[0]!.emit('exit', 0, null);
    children[1]!.emit('exit', 0, null);
    const result = await run;
    expect(result.exitCode).toBe(0);
  });

  it("nonzero exit persists the code but the session exit code stays the apps'", async () => {
    const supervisor = makeSupervisor();
    const run = supervisor.run();
    supervisor.spawnOneShot(target);
    children[2]!.emit('exit', 7, null);
    await flush();
    expect(lines).toContain('[launch] exited with code 7');
    // The failed launch is NOT a session failure: the apps still decide.
    supervisor.shutdown('interrupt');
    children[0]!.emit('exit', 0, null);
    children[1]!.emit('exit', 0, null);
    const result = await run;
    expect(result.exitCode).toBe(0);
  });

  it('shutdown SIGINTs a live one-shot with the children and escalation SIGTERMs it', async () => {
    jest.useFakeTimers();
    const supervisor = makeSupervisor({ graceMs: 5000 });
    void supervisor.run();
    supervisor.spawnOneShot(target);
    supervisor.shutdown('interrupt');
    expect(children[2]!.kill).toHaveBeenCalledWith('SIGINT');
    supervisor.shutdown('interrupt');
    expect(children[2]!.kill).toHaveBeenCalledWith('SIGTERM');
    // Shutdown-killed one-shots stay silent: the interrupt, not a crash.
    children[2]!.emit('exit', null, 'SIGTERM');
    await jest.advanceTimersByTimeAsync(0);
    expect(
      lines.some((line) => line.includes('[launch] exited with code'))
    ).toBe(false);
  });

  it('a session ending without shutdown still kills a live one-shot, silently', async () => {
    const supervisor = makeSupervisor();
    const run = supervisor.run();
    supervisor.spawnOneShot(target);
    // Both apps exit on their own: the session ends while the launch runs.
    children[0]!.emit('exit', 0, null);
    children[1]!.emit('exit', 0, null);
    await run;
    expect(children[2]!.kill).toHaveBeenCalled();
    expect(lines.some((line) => line.includes('[launch] exited'))).toBe(false);
  });
});
