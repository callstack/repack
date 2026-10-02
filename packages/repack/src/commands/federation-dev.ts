import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import * as colorette from 'colorette';
import packageJson from '../../package.json';
import { CLIError } from '../helpers/index.js';
import { runAdbReverse } from './common/runAdbReverse.js';
import {
  assertRemoteStandalone,
  ConfigFileInvalidError,
  FEDERATION_CONFIG_FILENAME,
  loadFederationConfig,
} from './federation/configFile.js';
import { devHeader } from './federation/devHeader.js';
import type { PlanInput, PlannedApp } from './federation/devPlan.js';
import { buildPlan } from './federation/devPlan.js';
import { buildLaunchPlan } from './federation/launchPlan.js';
import { isPortBusy, planPorts } from './federation/portPlanner.js';
import { resolveReactNativeBin } from './federation/rnBin.js';
import { RunnerConsole } from './federation/runnerConsole.js';
import {
  planToJson,
  renderPlanTable,
  renderStatusTable,
  statusToJson,
} from './federation/statusTable.js';
import type { SessionResult } from './federation/supervisor.js';
import { DevSupervisor } from './federation/supervisor.js';
import { runWizard } from './federation/wizard.js';
import type { CliConfig, FederationDevArguments } from './types.js';

/**
 * Readiness/TOCTOU probe: `GET url/status` answers with its body, anything
 * else (refused, timeout, non-200) is silence — never a thrown error, the
 * supervisor treats both as "not up".
 */
function probeStatus(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const request = http.get(`${url}/status`, { timeout: 1000 }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk: string) => {
        body += chunk;
      });
      response.on('end', () =>
        resolve(response.statusCode === 200 ? body : null)
      );
    });
    request.on('error', () => resolve(null));
    request.on('timeout', () => {
      request.destroy();
      resolve(null);
    });
  });
}

/** Split `--apps` into names, tolerating a merged array from the CLI. */
function parseAppList(apps: string | string[] | undefined): string[] {
  if (!apps) return [];
  const values = Array.isArray(apps) ? apps : [apps];
  return values.flatMap((value) =>
    value
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
  );
}

/** Usage error: actionable message, exit 2, nothing spawned. */
function usageError(message: string): void {
  console.error(message);
  process.exit(2);
}

/** `d` on the keymap: poke the host dev server's debugger endpoint. */
function postOpenDebugger(url: string): void {
  const request = http.request(
    `${url}/open-debugger`,
    { method: 'POST', timeout: 2000 },
    (response) => response.resume()
  );
  request.on('error', () => undefined);
  request.on('timeout', () => request.destroy());
  request.end();
}

/**
 * Run every app a `repack-federation.json` declares — host plus a session of
 * remotes — as one supervised dev session. Exit codes: 0 success or dry-run
 * plan, 1 port conflict / failed session, 2 usage or config error (nothing
 * spawned). `--dry-run` prints the plan and spawns nothing.
 *
 * @param _argv Original, non-parsed arguments.
 * @param _cliConfig Configuration object containing platform and project settings.
 * @param args Parsed command line arguments.
 */
export async function federationDev(
  _argv: string[],
  _cliConfig: CliConfig,
  args: FederationDevArguments
) {
  if (
    args.port !== undefined &&
    (!Number.isInteger(args.port) || args.port < 1 || args.port > 65535)
  ) {
    usageError(
      `Invalid --port ${args.port}: expected an integer between 1 and 65535.`
    );
    return;
  }
  if (
    args.platform !== undefined &&
    args.platform !== 'ios' &&
    args.platform !== 'android'
  ) {
    usageError(
      `Invalid --platform "${args.platform}": only "ios" and "android" are ` +
        'supported — the runner starts one dev server session per platform.'
    );
    return;
  }

  // --config <path>: a specific workspace file instead of the walk-up
  // default. Resolved against the caller's cwd up front; everything
  // downstream anchors on THIS file's directory as usual.
  let explicitConfigPath: string | undefined;
  if (args.config !== undefined) {
    explicitConfigPath = path.resolve(args.config);
    if (!fs.existsSync(explicitConfigPath)) {
      usageError(
        `--config ${explicitConfigPath} does not exist — pass the path to ` +
          'your repack-federation.json.'
      );
      return;
    }
  }

  let loaded: ReturnType<typeof loadFederationConfig>;
  try {
    loaded = loadFederationConfig(
      explicitConfigPath ? { filePath: explicitConfigPath } : {}
    );
  } catch (error) {
    if (error instanceof ConfigFileInvalidError) {
      usageError(`${error.filePath}: ${error.reasons.join('; ')}`);
      return;
    }
    throw error;
  }
  if (!loaded) {
    usageError(
      `No ${FEDERATION_CONFIG_FILENAME} found — federation-dev runs the apps ` +
        'that file declares. Create one with "react-native federation-init".'
    );
    return;
  }
  const { filePath, config } = loaded;

  const declaredNames = Object.keys(config.remotes);
  const requested = parseAppList(args.apps);
  const unknown = requested.filter((name) => !(name in config.remotes));
  if (unknown.length > 0) {
    usageError(
      `Unknown app ${unknown.map((name) => JSON.stringify(name)).join(', ')} — ` +
        `not a declared remote in ${filePath}. Known remotes: ` +
        (declaredNames.join(', ') || '(none)') +
        '.'
    );
    return;
  }
  if (args.standalone !== undefined && !(args.standalone in config.remotes)) {
    usageError(
      `Unknown app ${JSON.stringify(args.standalone)} — not a declared ` +
        `remote in ${filePath}. Known remotes: ` +
        (declaredNames.join(', ') || '(none)') +
        '.'
    );
    return;
  }

  // Standalone refuses through the shipped gate, before any planning.
  if (args.standalone !== undefined) {
    try {
      assertRemoteStandalone(config, filePath, args.standalone);
    } catch (error) {
      if (error instanceof CLIError) {
        usageError(error.message);
        return;
      }
      throw error;
    }
  }

  const configDir = path.dirname(filePath);
  // Each app runs with the react-native CLI resolved from its OWN root —
  // memoized per distinct root (single-dir twins resolve once) and an
  // unresolvable root fails as a usage error naming that app. No silent
  // fall-back to another app's install.
  const namesByRoot = new Map<string, string[]>();
  const noteRoot = (name: string, root: string) => {
    namesByRoot.set(root, [...(namesByRoot.get(root) ?? []), name]);
  };
  noteRoot('host', path.resolve(configDir, config.host.root ?? '.'));
  for (const [name, remote] of Object.entries(config.remotes)) {
    noteRoot(name, path.resolve(configDir, remote.root ?? '.'));
  }
  const cliByRoot = new Map<string, string>();
  const rnCliForRoot = (root: string): string => {
    const cached = cliByRoot.get(root);
    if (cached !== undefined) return cached;
    try {
      const cli = resolveReactNativeBin(root);
      cliByRoot.set(root, cli);
      return cli;
    } catch (error) {
      const names = namesByRoot.get(root)?.join(', ') ?? root;
      throw new CLIError(
        `${names}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  // Session context before anything else speaks (start.ts logo precedent):
  // a one-shot write, while stdout is still unowned — the wizard, plan and
  // status block all come after it. `--json` keeps stdout a pure contract.
  if (!args.json) {
    process.stdout.write(
      `${devHeader(packageJson.version, {
        colors: process.stdout.isTTY === true && colorette.isColorSupported,
      })}\n\n`
    );
  }

  // Wizard gate: --apps, --no-interactive or a non-TTY stdout suppress the
  // interactive wizard; the default session is then host + every remote.
  const planBase: PlanInput = {
    configPath: filePath,
    config,
    session: {
      remotes: requested.length > 0 ? requested : declaredNames,
      standaloneRemote: args.standalone,
    },
    overrides: {
      port: args.port,
      platform: args.platform === 'android' ? 'android' : args.platform,
      launch: args.launch,
    },
    ports: {},
    rnCliForRoot,
  };

  let effective: PlannedApp[];
  try {
    effective = buildPlan(planBase);
  } catch (error) {
    if (error instanceof CLIError) {
      usageError(error.message);
      return;
    }
    throw error;
  }

  // The wizard is an input source only: its answers rewrite the same plan
  // inputs the flags drive, then everything continues down one path.
  if (
    args.apps === undefined &&
    args.interactive !== false &&
    process.stdout.isTTY
  ) {
    const outcome = await runWizard({
      config,
      planned: effective,
      launch: planBase.overrides.launch,
    });
    if (outcome.status === 'cancelled') {
      // Cancel is a clean no-op, not a failure (init prompts precedent).
      process.exit(0);
      return;
    }
    const { answers } = outcome;
    planBase.session = {
      remotes:
        answers.session.remotes.length > 0
          ? answers.session.remotes
          : declaredNames,
      standaloneRemote: answers.session.standaloneRemote ?? args.standalone,
    };
    if (answers.platform !== undefined) {
      planBase.overrides.platform = answers.platform;
    }
    if (answers.launch !== undefined) {
      planBase.overrides.launch = answers.launch;
    }
    try {
      effective = buildPlan({ ...planBase, ports: answers.ports });
    } catch (error) {
      if (error instanceof CLIError) {
        usageError(error.message);
        return;
      }
      throw error;
    }
  }

  const conflicts: { app: string; port: number }[] = [];
  let ports: Record<string, number | 'auto'>;

  if (args.dryRun) {
    // Conflict rules run read-only against the real machine: a busy declared
    // port fails the same way a live run would — but nothing is allocated or
    // spawned, and unmanaged apps display `auto`.
    ports = {};
    for (const app of effective) {
      if (app.port === undefined) {
        ports[app.name] = 'auto';
      } else if (await isPortBusy(app.port)) {
        if (args.autoPorts) ports[app.name] = 'auto';
        else conflicts.push({ app: app.name, port: app.port });
      } else {
        ports[app.name] = app.port;
      }
    }
  } else {
    const resolved = await planPorts(effective, {
      autoPorts: args.autoPorts === true,
      probePort: isPortBusy,
    });
    conflicts.push(...resolved.conflicts);
    ports = resolved.ports;
  }

  if (conflicts.length > 0) {
    for (const conflict of conflicts) {
      console.error(
        `Port ${conflict.port} declared by ${conflict.app} is already in ` +
          'use. Free the port or rerun with --auto-ports.'
      );
    }
    process.exit(1);
    return;
  }

  const plan = buildPlan({ ...planBase, ports });
  const host = plan.find((app) => app.role === 'host')!;
  // The effective platform lives in the final plan (flags and wizard
  // answers both land there as `--platform <p>` on every child) — reading
  // args directly would print the flag's value over a wizard selection.
  const platformFlagIndex = host.spawn.args.indexOf('--platform');
  const platform =
    platformFlagIndex >= 0 ? host.spawn.args[platformFlagIndex + 1] : undefined;

  // Launch needs exactly one platform to run-<platform> against — the same
  // platform the final plan carries, so a wizard selection counts here too.
  if (planBase.overrides.launch === true && platform === undefined) {
    usageError(
      '--launch needs a single platform: pass --platform ios or --platform ' +
        'android (or --no-launch to serve only).'
    );
    return;
  }

  // From here on the sink is the one stdout owner (D5 row H): plan, logs,
  // status block and JSON contracts all route through it, nothing else
  // writes stdout while the session is alive.
  const runnerConsole = new RunnerConsole({
    stdout: process.stdout,
    stdin: process.stdin,
  });
  // Terminal restore on every exit path. (`exit-hook` is ESM-only and a
  // CJS build cannot require it; `process.on('exit')` fires for
  // process.exit() too and the finally below covers the throw paths.)
  const releaseTerminal = () => runnerConsole.release();
  process.on('exit', releaseTerminal);
  runnerConsole.persist(args.json ? [planToJson(plan)] : renderPlanTable(plan));

  if (args.dryRun) {
    runnerConsole.release();
    process.exit(0);
    return;
  }

  // Live session. adb: the host port goes through the audited
  // `runAdbReverse` helper exactly once (device discovery lives inside it);
  // remote ports are printed guidance only — the runner never executes adb
  // for them (threat row "adb execution").
  await runAdbReverse({ port: host.port as number });
  for (const app of plan) {
    if (app.role === 'remote') {
      runnerConsole.log(
        `Remote port: run "adb reverse tcp:${app.port} tcp:${app.port}" on ` +
          'your device to reach it from the app.'
      );
    }
  }
  const runTargets = platform
    ? `run-${platform}`
    : 'run-ios or run-android (pick your device)';
  runnerConsole.log(
    `Run your app with: react-native ${runTargets} — it reaches the host ` +
      `dev server at ${host.url}`
  );
  // The keymap disclosure (D5 row F): exactly these keys do something.
  runnerConsole.persist(['Keys: q quit | d open debugger | Ctrl-C quit']);

  // Readiness-gated one-shot app launch: the target is the standalone
  // remote's project in a standalone session, the host's otherwise, and it
  // spawns the FIRST time THAT app's dev server answers — never again,
  // whatever readiness does later.
  const launchTarget =
    planBase.overrides.launch === true &&
    (platform === 'ios' || platform === 'android')
      ? buildLaunchPlan({
          plan,
          platform,
          ...(args.device === undefined ? {} : { device: args.device }),
          rnCliForRoot,
        })
      : undefined;
  let launchSpawned = false;
  const supervisor = new DevSupervisor(plan, runnerConsole, {
    probeStatus,
    ...(launchTarget === undefined
      ? {}
      : {
          onFirstReady: (appName: string) => {
            if (appName === launchTarget.triggerApp && !launchSpawned) {
              launchSpawned = true;
              supervisor.spawnOneShot(launchTarget);
            }
          },
        }),
  });
  // One Ctrl-C asks for the supervisor's ordered shutdown; the second one
  // escalates inside the supervisor (SIGINT → grace → SIGTERM).
  const onSigint = () => supervisor.shutdown('interrupt');
  process.on('SIGINT', onSigint);
  runnerConsole.armKeymap({
    q: onSigint,
    '\u0003': onSigint,
    d: () => postOpenDebugger(host.url),
  });

  let lastDoc = '';
  let lastRowsKey = '';
  const statusWatch = setInterval(() => {
    const statuses = supervisor.getStatuses();
    if (args.json) {
      const doc = statusToJson(plan, statuses);
      if (doc !== lastDoc) {
        lastDoc = doc;
        runnerConsole.log(doc);
      }
    } else {
      const rows = renderStatusTable(plan, statuses);
      const key = rows.join('\n');
      if (key !== lastRowsKey) {
        lastRowsKey = key;
        runnerConsole.setStatus(rows);
      }
    }
  }, 250);

  let result: SessionResult;
  try {
    result = await supervisor.run();
  } finally {
    clearInterval(statusWatch);
    process.off('SIGINT', onSigint);
    process.off('exit', releaseTerminal);
    runnerConsole.release();
  }

  // Terminal is back to plain: the final summary is static output.
  const statuses = supervisor.getStatuses();
  if (args.json) {
    runnerConsole.persist([statusToJson(plan, statuses)]);
  } else {
    runnerConsole.persist(renderStatusTable(plan, statuses));
  }
  process.exit(result.exitCode);
}
