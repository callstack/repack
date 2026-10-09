import path from 'node:path';
import { CLIError } from '../../helpers/index.js';
import { detectBundler } from '../common/config/detectBundler.js';
import type { Bundler } from '../types.js';
import type { FederationConfig } from './configFile.js';

/** One app exactly as the supervisor and the tables will consume it. */
export interface PlannedApp {
  /** 'host' | declared remote name. */
  name: string;
  role: 'host' | 'remote';
  /** Absolute app root (spawn cwd). */
  root: string;
  /** Absolute bundler config; absent ⇒ child-side discovery (today). */
  config?: string;
  bundler: Bundler;
  /** undefined only in dry-run for unmanaged apps. */
  port?: number;
  url: string;
  standalone?: boolean;
  spawn: { file: string; args: string[]; cwd: string };
  /** Display + JSON `command`: the exact argv, shell-quoted for readability. */
  commandLine: string;
}

export interface PlanInput {
  configPath: string;
  config: FederationConfig;
  session: { remotes: string[]; standaloneRemote?: string };
  overrides: {
    port?: number;
    platform?: 'ios' | 'android';
    configChoices?: Record<string, string>;
    /**
     * The single launch decision: flags seed it, the wizard rewrites it —
     * exactly like the other overrides. `buildPlan` itself ignores it (the
     * launch child is not a `start` argv); `federation-dev` consumes it
     * after the final plan, so wizard and flag runs share one source.
     */
    launch?: boolean;
  };
  /** From the port planner; `'auto'` only in dry-run for unmanaged apps. */
  ports: Record<string, number | 'auto'>;
  /**
   * The `react-native` CLI for a given app root — every app runs with the
   * CLI installed in its OWN root (callers memoize per distinct root and
   * map resolution failures to the owning app; no cross-app fallback).
   */
  rnCliForRoot: (appRoot: string) => string;
}

/** Quote argv parts the way a shell display would — pure rendering. */
function renderCommand(argv: string[]): string {
  return argv.map((part) => (/\s/.test(part) ? `"${part}"` : part)).join(' ');
}

function buildApp(
  input: PlanInput,
  name: string,
  role: 'host' | 'remote',
  entry: { root?: string; config?: string; port?: number },
  standalone: boolean
): PlannedApp {
  const configDir = path.dirname(input.configPath);
  const root = path.resolve(configDir, entry.root ?? '.');
  const declared = input.ports[name];
  const port =
    declared !== undefined
      ? typeof declared === 'number'
        ? declared
        : undefined
      : role === 'host'
        ? (input.overrides.port ?? entry.port ?? 8081)
        : entry.port;
  const portDisplay = port === undefined ? '<auto>' : String(port);
  const appConfig =
    input.overrides.configChoices?.[name] ??
    (entry.config === undefined
      ? undefined
      : path.resolve(configDir, entry.config));
  const bundler = detectBundler(root, appConfig);

  // Executed as `process.execPath <rnCli> start …`: the argv head is the
  // app's own resolved local react-native CLI, so PATH is never consulted
  // and no other app's install is ever borrowed.
  const args = [input.rnCliForRoot(root), 'start', '--bundler', bundler];
  if (appConfig !== undefined) args.push('--config', appConfig);
  args.push('--port', portDisplay);
  // The supervisor owns stdin and signals: children are never interactive.
  args.push('--no-interactive');
  if (input.overrides.platform !== undefined) {
    args.push('--platform', input.overrides.platform);
  }
  if (standalone) args.push('--standalone');
  // The runner owns adb reversal entirely (host included reverses itself via
  // runAdbReverse), so no child may reverse on its own (D8).
  args.push('--no-reverse-port');

  const spawn = { file: process.execPath, args, cwd: root };
  return {
    name,
    role,
    root,
    ...(appConfig === undefined ? {} : { config: appConfig }),
    bundler,
    ...(port === undefined ? {} : { port }),
    url: `http://localhost:${portDisplay}`,
    ...(standalone ? { standalone } : {}),
    spawn,
    commandLine: renderCommand([spawn.file, ...spawn.args]),
  };
}

/**
 * Resolve the session plan: the host plus every selected remote, host first
 * and remotes in file declaration order. Pure — no probing, no spawning, no
 * reading `process.cwd`: all paths anchor at the config file's directory
 * (threat row "Process cwd authority") and every hostile-but-valid value
 * stays an exact argv array entry — the plan carries no `shell` field
 * anywhere (threat row "Subprocess spawn").
 *
 * Precedence per value: flags > file > defaults — `--port` > host `port`
 * field > 8081; per-run config choice > declared `config` > absent (spawn
 * without `--config`, the app's own discovery applies). A port-planner
 * entry, when present, wins outright: it already resolved conflicts
 * (`--auto-ports` reassignment) or marks dry-run auto allocation.
 */
export function buildPlan(input: PlanInput): PlannedApp[] {
  const unknown = input.session.remotes.filter(
    (name) => !(name in input.config.remotes)
  );
  if (
    input.session.standaloneRemote !== undefined &&
    !(input.session.standaloneRemote in input.config.remotes)
  ) {
    unknown.push(input.session.standaloneRemote);
  }
  if (unknown.length > 0) {
    throw new CLIError(
      `Unknown app ${unknown.map((name) => JSON.stringify(name)).join(', ')} — ` +
        `not a declared remote in ${input.configPath}. Known remotes: ` +
        (Object.keys(input.config.remotes).join(', ') || '(none)') +
        '.'
    );
  }

  // `--standalone r` implies r ∈ session, even when --apps omitted it.
  const sessionRemotes = [...input.session.remotes];
  if (
    input.session.standaloneRemote !== undefined &&
    !sessionRemotes.includes(input.session.standaloneRemote)
  ) {
    sessionRemotes.push(input.session.standaloneRemote);
  }

  const plan: PlannedApp[] = [
    buildApp(input, 'host', 'host', input.config.host, false),
  ];
  for (const [name, entry] of Object.entries(input.config.remotes)) {
    if (!sessionRemotes.includes(name)) continue;
    plan.push(
      buildApp(
        input,
        name,
        'remote',
        entry,
        name === input.session.standaloneRemote
      )
    );
  }
  return plan;
}
