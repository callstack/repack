import type { PlannedApp } from './devPlan.js';

/** The one-shot app-launch child, in the supervisor's spawn shape. */
export interface LaunchTarget {
  /** App project the app is built and launched from (spawn cwd). */
  root: string;
  /** Plan row whose readiness triggers the launch. */
  triggerApp: string;
  /** Same head as the supervised children: `process.execPath`. */
  file: string;
  /** `[<target root's own cli.js>, run-<platform>, --no-packager, (--device …)?]`. */
  args: string[];
  cwd: string;
}

/**
 * Resolve the one-shot `run-<platform>` command that puts the app on the
 * device once the session is serving (pure — the caller gates on an
 * explicit launch choice and a narrowed platform).
 *
 * Target: a standalone session is served by the standalone remote alone,
 * so the app project is THAT remote's root; otherwise the host root. The
 * CLI is resolved from the target root exactly like the dev-server
 * children — each app runs with its own install, never a borrowed one.
 *
 * `--no-packager` always: the session's dev servers ARE the packager, and
 * the RN CLI starting a second one would either fail on the busy port or
 * split bundle serving away from the federation session. Device selection
 * is delegated to the RN CLI — `--device` rides verbatim as one argv
 * entry (threat row "Subprocess spawn": no shell, no interpretation) and
 * an ambiguous id surfaces as the CLI's own error in the launch stream.
 */
export function buildLaunchPlan(input: {
  plan: PlannedApp[];
  platform: 'ios' | 'android';
  device?: string;
  rnCliForRoot: (appRoot: string) => string;
}): LaunchTarget {
  const target =
    input.plan.find((app) => app.standalone === true) ??
    input.plan.find((app) => app.role === 'host')!;
  const root = target.root;
  return {
    root,
    triggerApp: target.name,
    file: process.execPath,
    args: [
      input.rnCliForRoot(root),
      `run-${input.platform}`,
      '--no-packager',
      ...(input.device === undefined ? [] : ['--device', input.device]),
    ],
    cwd: root,
  };
}
