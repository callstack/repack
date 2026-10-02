import http from 'node:http';
import net from 'node:net';
import type { PlannedApp } from './devPlan.js';

/** Busy probe for one port — injectable so tests never touch real sockets. */
export type Probe = (port: number) => Promise<boolean>;

const TCP_CONNECT_TIMEOUT_MS = 150;
const STATUS_PROBE_TIMEOUT_MS = 150;

export interface PortPlanResult {
  /** Final port per app; apps in `conflicts` have NO entry. */
  ports: Record<string, number>;
  conflicts: Array<{ app: string; port: number }>;
}

/**
 * A port is busy when EITHER leg answers: a TCP connect succeeds (a live
 * listener exists) or a `GET /status` responds. GET-only, 127.0.0.1 only,
 * hard timeouts on both legs (threat row "Network probes"): a hang, a
 * garbage body or a slow server all settle inside ~2×150 ms — a probe that
 * never answers is classified free, never left open.
 */
export async function isPortBusy(port: number): Promise<boolean> {
  if (await canConnect(port)) return true;
  return answersStatus(port);
}

function canConnect(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    const settle = (busy: boolean) => {
      socket.destroy();
      resolve(busy);
    };
    socket.setTimeout(TCP_CONNECT_TIMEOUT_MS, () => settle(false));
    socket.once('connect', () => settle(true));
    socket.once('error', () => settle(false));
  });
}

function answersStatus(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const request = http.get(
      {
        host: '127.0.0.1',
        port,
        path: '/status',
        timeout: STATUS_PROBE_TIMEOUT_MS,
      },
      (response) => {
        // ANY response is a positive answer — the body decides readiness
        // elsewhere, busy-ness is binary here.
        response.destroy();
        resolve(true);
      }
    );
    request.on('timeout', () => {
      request.destroy();
      resolve(false);
    });
    request.on('error', () => resolve(false));
  });
}

/**
 * Allocate a free port via `listen 0` and release it. TOCTOU is inherent to
 * the release-then-spawn pattern — post-spawn detection
 * (`classifyDeadChild`) is the designed safety net.
 */
export function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
  });
}

/**
 * Resolve session ports from a first-pass plan: declared ports win when
 * free, unmanaged apps always get a freshly allocated free port (no
 * `--auto-ports` needed), and a busy declared port is either reassigned
 * (`--auto-ports`) or reported as a conflict the command turns into exit 1
 * — before anything spawns, never as a hang.
 */
export async function planPorts(
  plan: PlannedApp[],
  opts: { autoPorts: boolean; probePort: Probe }
): Promise<PortPlanResult> {
  const ports: Record<string, number> = {};
  const conflicts: PortPlanResult['conflicts'] = [];

  for (const app of plan) {
    if (app.port === undefined) {
      // Unmanaged: always allocated, nothing declared to clash with.
      ports[app.name] = await getFreePort();
      continue;
    }
    if (await opts.probePort(app.port)) {
      if (opts.autoPorts) {
        ports[app.name] = await getFreePort();
      } else {
        conflicts.push({ app: app.name, port: app.port });
      }
      continue;
    }
    ports[app.name] = app.port;
  }

  return { ports, conflicts };
}

export interface DeadChildVerdict {
  kind: 'address-in-use' | 'crash';
  message: string;
}

/**
 * TOCTOU classification: the child died; was its port hijacked between
 * probe and spawn? Port answers `GET /status` ⇒ an address-in-use-style
 * verdict naming app and port; port silent ⇒ plain crash. Either way the
 * verdict is terminal — the supervisor never leaves a dead child pending.
 */
export function classifyDeadChild(
  appName: string,
  port: number,
  statusAnswered: boolean
): DeadChildVerdict {
  if (statusAnswered) {
    return {
      kind: 'address-in-use',
      message:
        `${appName} exited but port ${port} is serving /status — another ` +
        `process took the port between the probe and the spawn ` +
        `(EADDRINUSE-style). Free the port or rerun with --auto-ports.`,
    };
  }
  return {
    kind: 'crash',
    message:
      `${appName} exited before its server became ready ` +
      `(port ${port} answers nothing — not a port conflict).`,
  };
}
