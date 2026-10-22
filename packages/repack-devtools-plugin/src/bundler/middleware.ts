import type { IncomingMessage, ServerResponse } from 'node:http';
import { DEV_SERVER_ROUTE, LIMITS } from '../shared/constants.js';
import { isFailedRequest, NO_RESPONSE_STATUS } from '../shared/requests.js';
import type {
  DevServerState,
  Diagnostic,
  ServerFault,
} from '../shared/types.js';
import {
  diagnoseCompilations,
  diagnoseRequests,
  getRequestPlatform,
} from './diagnostics.js';
import {
  addServerFault,
  applyServerFault,
  FAULT_HEADER,
  parseServerFault,
} from './faults.js';
import {
  type DevServerStore,
  getDevServerStore,
  pushRequest,
} from './store.js';

type Next = (error?: unknown) => void;
export type Middleware = ((
  req: IncomingMessage,
  res: ServerResponse,
  next: Next
) => void) & { __repackDevTools?: true };

/** Requests that are noise for debugging: tooling endpoints and inspector traffic. */
const IGNORED = [
  DEV_SERVER_ROUTE,
  '/rozenite',
  '/json',
  '/status',
  '/inspector',
  '/open-debugger',
  '/debugger-frontend',
  '/favicon.ico',
  // probed by the DevTools frontend; a 404 here is expected outside Expo CLI
  '/_expo',
];

export const getDevServerState = (
  store: DevServerStore = getDevServerStore()
): DevServerState => {
  const compilations = Array.from(store.compilations.values()).sort((a, b) =>
    a.platform.localeCompare(b.platform)
  );
  return {
    port: store.port,
    startedAt: store.startedAt,
    compilations,
    requests: store.requests,
    faults: store.faults,
    diagnostics: [
      ...diagnoseServerFaults(store.faults),
      ...diagnoseCompilations(compilations),
      ...diagnoseRequests(store.requests, compilations),
    ],
  };
};

const describeServerFault = (fault: ServerFault) =>
  [
    fault.drop ? 'drop connection' : undefined,
    fault.status !== undefined ? `status ${fault.status}` : undefined,
    fault.delayMs ? `delay ${fault.delayMs}ms` : undefined,
    fault.remaining !== undefined ? `${fault.remaining} left` : undefined,
  ]
    .filter(Boolean)
    .join(', ');

const diagnoseServerFaults = (faults: ServerFault[]): Diagnostic[] =>
  faults
    .filter((fault) => fault.remaining === undefined || fault.remaining > 0)
    .map((fault) => ({
      severity: 'info',
      area: 'faults',
      message: `Injected server fault ${fault.id} is active for "${fault.match}" (${describeServerFault(fault)}, ${fault.hits} hit(s)). Failures it causes are not real bugs.`,
      hint: `Remove it with DELETE ${DEV_SERVER_ROUTE}/faults?id=${fault.id} or the clear-faults tool.`,
      ref: fault.id,
    }));

const MAX_BODY_BYTES = 64 * 1024;

const readJsonBody = (req: IncomingMessage) =>
  new Promise<unknown>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request body too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(new Error('Request body is not valid JSON.'));
      }
    });
    req.on('error', reject);
  });

const handleFaults = (
  req: IncomingMessage,
  res: ServerResponse,
  params: URLSearchParams,
  store: DevServerStore
) => {
  if (req.method === 'GET') return sendJson(res, 200, store.faults);
  if (req.method === 'DELETE') {
    const id = params.get('id');
    const before = store.faults.length;
    store.faults = id ? store.faults.filter((fault) => fault.id !== id) : [];
    return sendJson(res, 200, { removed: before - store.faults.length });
  }
  if (req.method === 'POST') {
    readJsonBody(req).then(
      (body) => {
        const fault = parseServerFault(body, store);
        if (typeof fault === 'string') {
          return sendJson(res, 400, { error: fault });
        }
        return sendJson(res, 201, addServerFault(store, fault));
      },
      (error: unknown) =>
        sendJson(res, 400, {
          error: error instanceof Error ? error.message : String(error),
        })
    );
    return;
  }
  return sendJson(res, 405, { error: 'Use GET, POST or DELETE.' });
};

const sendJson = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify(body));
};

/**
 * Serves `GET <route>/state`, `GET <route>/compilation?platform=`,
 * `POST <route>/clear` and `GET|POST|DELETE <route>/faults`, so agents can
 * read bundler state and inject faults with curl even when the app is not
 * running.
 */
export const createStateMiddleware = (): Middleware => {
  const middleware: Middleware = (req, res, next) => {
    const url = req.url ?? '';
    if (!url.startsWith(DEV_SERVER_ROUTE)) return next();
    const [path, query = ''] = url.slice(DEV_SERVER_ROUTE.length).split('?');
    const params = new URLSearchParams(query);
    const store = getDevServerStore();

    if (path === '/faults') return handleFaults(req, res, params, store);
    if (req.method === 'POST' && path === '/clear') {
      store.requests.length = 0;
      return sendJson(res, 200, { cleared: 'requests' });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();

    if (path === '/state' || path === '' || path === '/') {
      const state = getDevServerState(store);
      const requests = params.get('requests') ?? 'all';
      return sendJson(res, 200, {
        ...state,
        requests:
          requests === 'failed'
            ? state.requests.filter(isFailedRequest)
            : requests === 'none'
              ? []
              : state.requests,
      });
    }
    if (path === '/compilation') {
      const platform = params.get('platform');
      const compilation = platform
        ? store.compilations.get(platform)
        : undefined;
      if (!compilation) {
        return sendJson(res, 404, {
          error: `No compilation for platform "${platform}". Known: ${Array.from(store.compilations.keys()).join(', ') || '(none yet)'}`,
        });
      }
      return sendJson(res, 200, compilation);
    }
    return sendJson(res, 404, {
      error: `Unknown route. Use ${DEV_SERVER_ROUTE}/state, ${DEV_SERVER_ROUTE}/compilation?platform=<platform>, ${DEV_SERVER_ROUTE}/faults or POST ${DEV_SERVER_ROUTE}/clear.`,
    });
  };
  middleware.__repackDevTools = true;
  return middleware;
};

const faultOf = (res: ServerResponse) => {
  const header = res.getHeader(FAULT_HEADER);
  return typeof header === 'string' ? header : undefined;
};

const isTooling = (url: string) =>
  IGNORED.some((prefix) => url.startsWith(prefix));

/** Applies injected server faults; must run after the request log. */
export const createFaultMiddleware = (): Middleware => {
  const middleware: Middleware = (req, res, next) => {
    if (isTooling(req.url ?? '')) return next();
    applyServerFault(req, res, next);
  };
  middleware.__repackDevTools = true;
  return middleware;
};

/**
 * Logs every request with its status and duration. For failed responses the
 * first bytes of the body are kept, which is usually the explanation.
 */
export const createRequestLogMiddleware = (): Middleware => {
  const middleware: Middleware = (req, res, next) => {
    const url = req.url ?? '';
    if (IGNORED.some((prefix) => url.startsWith(prefix))) return next();

    const startedAt = Date.now();
    const chunks: Buffer[] = [];
    let captured = 0;
    const capture = (chunk: unknown, encoding?: unknown) => {
      if (captured >= LIMITS.responseBodyBytes || chunk == null) return;
      if (typeof chunk === 'function') return;
      const buffer = Buffer.isBuffer(chunk)
        ? chunk
        : typeof chunk === 'string'
          ? Buffer.from(
              chunk,
              typeof encoding === 'string' && Buffer.isEncoding(encoding)
                ? encoding
                : 'utf8'
            )
          : chunk instanceof Uint8Array
            ? Buffer.from(chunk)
            : undefined;
      if (!buffer) return;
      const slice = buffer.subarray(0, LIMITS.responseBodyBytes - captured);
      chunks.push(slice);
      captured += slice.length;
    };

    // `write`/`end` have several overloads; a Proxy keeps their exact types
    // while still seeing every call's arguments.
    res.write = new Proxy(res.write, {
      apply(target, thisArg, args) {
        capture(args[0], args[1]);
        return Reflect.apply(target, thisArg, args);
      },
    });
    res.end = new Proxy(res.end, {
      apply(target, thisArg, args) {
        capture(args[0], args[1]);
        return Reflect.apply(target, thisArg, args);
      },
    });

    const log = (finished: boolean) => {
      try {
        const status = finished ? res.statusCode : NO_RESPONSE_STATUS;
        pushRequest(getDevServerStore(), {
          at: startedAt,
          method: req.method ?? 'GET',
          url,
          status,
          durationMs: Date.now() - startedAt,
          platform: getRequestPlatform(url),
          fault: faultOf(res),
          userAgent: req.headers['user-agent'],
          responseBody:
            status >= 400 && chunks.length
              ? Buffer.concat(chunks).toString('utf8')
              : undefined,
        });
      } catch {
        // logging must never break a response
      }
    };
    res.once('finish', () => log(true));
    // dropped or aborted before a response was sent: no `finish` event
    res.once('close', () => {
      if (!res.writableFinished) log(false);
    });
    next();
  };
  middleware.__repackDevTools = true;
  return middleware;
};
