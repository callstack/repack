import type { IncomingMessage, ServerResponse } from 'node:http';
import { DEV_SERVER_ROUTE, LIMITS } from '../shared/constants.js';
import type { DevServerState } from '../shared/types.js';
import {
  diagnoseCompilations,
  diagnoseRequests,
  getRequestPlatform,
} from './diagnostics.js';
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
    diagnostics: [
      ...diagnoseCompilations(compilations),
      ...diagnoseRequests(store.requests, compilations),
    ],
  };
};

const sendJson = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify(body));
};

/**
 * Serves `GET <route>/state`, `GET <route>/compilation?platform=` and
 * `POST <route>/clear`, so agents can read bundler state with curl even when
 * the app is not running.
 */
export const createStateMiddleware = (): Middleware => {
  const middleware: Middleware = (req, res, next) => {
    const url = req.url ?? '';
    if (!url.startsWith(DEV_SERVER_ROUTE)) return next();
    const [path, query = ''] = url.slice(DEV_SERVER_ROUTE.length).split('?');
    const params = new URLSearchParams(query);
    const store = getDevServerStore();

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
            ? state.requests.filter((request) => request.status >= 400)
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
      error: `Unknown route. Use ${DEV_SERVER_ROUTE}/state, ${DEV_SERVER_ROUTE}/compilation?platform=<platform> or POST ${DEV_SERVER_ROUTE}/clear.`,
    });
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

    res.once('finish', () => {
      try {
        const status = res.statusCode;
        pushRequest(getDevServerStore(), {
          at: startedAt,
          method: req.method ?? 'GET',
          url,
          status,
          durationMs: Date.now() - startedAt,
          platform: getRequestPlatform(url),
          userAgent: req.headers['user-agent'],
          responseBody:
            status >= 400 && chunks.length
              ? Buffer.concat(chunks).toString('utf8')
              : undefined,
        });
      } catch {
        // logging must never break a response
      }
    });
    next();
  };
  middleware.__repackDevTools = true;
  return middleware;
};
