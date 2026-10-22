import { createServer, type Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  RepackDevToolsCollectorPlugin,
  recordBuildDone,
  recordBuildStart,
} from '../bundler/collector';
import { diagnoseRequests, getRequestPlatform } from '../bundler/diagnostics';
import {
  createFaultMiddleware,
  createRequestLogMiddleware,
  createStateMiddleware,
  getDevServerState,
  type Middleware,
} from '../bundler/middleware';
import { getCompilation, getDevServerStore } from '../bundler/store';
import { withRepackDevTools } from '../bundler/withRepackDevTools';
import { DEV_SERVER_STORE_GLOBAL } from '../shared/constants';
import { isDevServerState } from '../shared/guards';

const stats = (json: Record<string, unknown>, hasErrors = false) => ({
  hasErrors: () => hasErrors,
  toJson: () => json,
});

beforeEach(() => {
  Reflect.deleteProperty(globalThis, DEV_SERVER_STORE_GLOBAL);
});

describe('collector', () => {
  it('records build status, issues and assets per platform', () => {
    const store = getDevServerStore();
    recordBuildStart(
      store,
      'android',
      { modifiedFiles: new Set(['/app/src/App.tsx']) },
      1000
    );
    expect(getCompilation(store, 'android').status).toBe('compiling');

    recordBuildDone(
      store,
      'android',
      stats(
        {
          hash: 'abc',
          errors: [
            {
              message:
                '\u001b[31mModule not found: Error: Can\'t resolve "./Missing"\u001b[39m',
              moduleName: './src/App.tsx',
              loc: '3:0-30',
            },
          ],
          warnings: [],
          errorsCount: 1,
          warningsCount: 0,
          assets: [{ name: 'index.bundle', size: 1024, chunkNames: ['main'] }],
        },
        true
      ),
      1500
    );

    const compilation = getCompilation(store, 'android');
    expect(compilation).toMatchObject({
      status: 'failed',
      builds: 1,
      durationMs: 500,
      hash: 'abc',
      errorCount: 1,
      changedFiles: ['/app/src/App.tsx'],
      assets: [{ name: 'index.bundle', size: 1024, chunkNames: ['main'] }],
    });
    expect(compilation.errors[0].message).toBe(
      'Module not found: Error: Can\'t resolve "./Missing"'
    );
    expect(getDevServerState().diagnostics[0]).toMatchObject({
      severity: 'error',
      area: 'compilation',
      ref: 'compilation:android',
    });
  });

  it('taps the compiler hooks', () => {
    const taps = new Map<string, (...args: never[]) => void>();
    const hook = (name: string) => ({
      tap: (_: string, callback: (...args: never[]) => void) => {
        taps.set(name, callback);
      },
    });
    new RepackDevToolsCollectorPlugin({ platform: 'ios' }).apply({
      hooks: {
        watchRun: hook('watchRun'),
        invalid: hook('invalid'),
        done: hook('done'),
      },
    });
    expect(Array.from(taps.keys())).toEqual(['watchRun', 'invalid', 'done']);
  });
});

describe('diagnoseRequests', () => {
  it('suggests similar emitted assets for a chunk 404', () => {
    const store = getDevServerStore();
    const compilation = getCompilation(store, 'android');
    compilation.assets = [
      { name: 'src_Async_tsx.chunk.bundle', size: 10 },
      { name: 'index.bundle', size: 10 },
    ];
    const [diagnostic] = diagnoseRequests(
      [
        {
          seq: 1,
          at: 0,
          method: 'GET',
          url: '/android/src_Async_ts.chunk.bundle',
          status: 404,
          durationMs: 1,
          platform: getRequestPlatform('/android/src_Async_ts.chunk.bundle'),
        },
      ],
      [compilation]
    );
    expect(diagnostic.severity).toBe('error');
    expect(diagnostic.hint).toContain('src_Async_tsx.chunk.bundle');
  });

  it('groups repeated failures', () => {
    const request = {
      at: 0,
      method: 'POST',
      url: '/symbolicate',
      status: 400,
      durationMs: 1,
      responseBody: 'Cannot infer platform from stack trace',
    };
    const diagnostics = diagnoseRequests(
      [
        { ...request, seq: 1 },
        { ...request, seq: 2 },
      ],
      []
    );
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe(
      'POST /symbolicate 400 (2x): Cannot infer platform from stack trace.'
    );
  });
});

describe('middlewares', () => {
  let server: Server;
  let origin: string;

  const listen = (middlewares: Middleware[]) =>
    new Promise<void>((resolve) => {
      server = createServer((req, res) => {
        const run = (index: number) => {
          const middleware = middlewares[index];
          if (middleware) {
            middleware(req, res, () => run(index + 1));
            return;
          }
          if (req.url?.startsWith('/missing')) {
            res.statusCode = 404;
            // Body split across write() and end() to check both are captured.
            res.write('Cannot GET ');
            res.end('missing chunk');
            return;
          }
          res.end('ok');
        };
        run(0);
      });
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          origin = `http://127.0.0.1:${address.port}`;
        }
        resolve();
      });
    });

  afterEach(
    () => new Promise<void>((resolve) => server.close(() => resolve()))
  );

  it('logs requests, keeps failed bodies and serves state', async () => {
    await listen([createStateMiddleware(), createRequestLogMiddleware()]);

    await fetch(`${origin}/index.bundle?platform=ios`);
    await fetch(`${origin}/missing/chunk.bundle?platform=ios`);
    await fetch(`${origin}/repack-devtools/state`);

    const all: unknown = await (
      await fetch(`${origin}/repack-devtools/state`)
    ).json();
    expect(isDevServerState(all)).toBe(true);
    if (!isDevServerState(all)) return;
    expect(all.requests.map((request) => request.url)).toEqual([
      '/index.bundle?platform=ios',
      '/missing/chunk.bundle?platform=ios',
    ]);
    expect(all.requests[1]).toMatchObject({
      status: 404,
      platform: 'ios',
      responseBody: 'Cannot GET missing chunk',
    });
    expect(all.requests[0].responseBody).toBeUndefined();

    const failed: unknown = await (
      await fetch(`${origin}/repack-devtools/state?requests=failed`)
    ).json();
    expect(isDevServerState(failed) && failed.requests).toHaveLength(1);

    const clear = await fetch(`${origin}/repack-devtools/clear`, {
      method: 'POST',
    });
    expect(clear.status).toBe(200);
    expect(getDevServerStore().requests).toEqual([]);

    const unknownPlatform = await fetch(
      `${origin}/repack-devtools/compilation?platform=windows`
    );
    expect(unknownPlatform.status).toBe(404);
  });

  const addFault = async (fault: Record<string, unknown>) => {
    const response = await fetch(`${origin}/repack-devtools/faults`, {
      method: 'POST',
      body: JSON.stringify(fault),
    });
    return { status: response.status, body: await response.json() };
  };

  const stack = () => [
    createStateMiddleware(),
    createRequestLogMiddleware(),
    createFaultMiddleware(),
  ];

  it('answers matching requests with an injected status a limited number of times', async () => {
    await listen(stack());

    const added = await addFault({
      match: '/miniapp/',
      status: 503,
      times: 1,
      platform: 'ios',
    });
    expect(added.status).toBe(201);
    expect(added.body).toMatchObject({ id: 'server-fault-1', remaining: 1 });

    const android = await fetch(`${origin}/miniapp/a.bundle?platform=android`);
    expect(android.status).toBe(200);
    const faulted = await fetch(`${origin}/miniapp/a.bundle?platform=ios`);
    expect(faulted.status).toBe(503);
    expect(await faulted.text()).toContain('Injected fault server-fault-1');
    const recovered = await fetch(`${origin}/miniapp/a.bundle?platform=ios`);
    expect(recovered.status).toBe(200);

    const state = getDevServerState();
    expect(state.requests.map((request) => request.fault)).toEqual([
      undefined,
      'server-fault-1',
      undefined,
    ]);
    expect(state.faults[0]).toMatchObject({ hits: 1, remaining: 0 });
    // used up: no longer reported as active
    expect(state.diagnostics.map((item) => item.ref)).not.toContain(
      'server-fault-1'
    );
  });

  it('logs dropped connections and reports active faults', async () => {
    await listen(stack());
    await addFault({ match: '/\\.bundle$/', drop: true });

    await expect(fetch(`${origin}/index.bundle`)).rejects.toThrow();
    // tooling routes are never faulted
    const state = await fetch(`${origin}/repack-devtools/state`);
    expect(state.status).toBe(200);
    await new Promise((resolve) => setTimeout(resolve, 10));

    const { requests, diagnostics } = getDevServerState();
    expect(requests).toEqual([
      expect.objectContaining({
        url: '/index.bundle',
        status: 0,
        fault: 'server-fault-1',
      }),
    ]);
    expect(diagnostics.map((item) => item.area)).toEqual(['faults', 'faults']);
    expect(diagnostics[1].message).toContain('connection dropped');
  });

  it('delays requests and serves them normally', async () => {
    await listen(stack());
    await addFault({ match: 'slow', delayMs: 40 });
    const startedAt = Date.now();
    const response = await fetch(`${origin}/slow.bundle`);
    expect(response.status).toBe(200);
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(35);
  });

  it('validates, lists and removes faults', async () => {
    await listen(stack());
    expect(await addFault({ status: 500 })).toMatchObject({ status: 400 });
    expect(await addFault({ match: 'x' })).toMatchObject({ status: 400 });
    expect(await addFault({ match: 'x', status: 42 })).toMatchObject({
      status: 400,
    });
    await addFault({ match: 'a', status: 500 });
    await addFault({ match: 'b', status: 500 });

    const list = await (await fetch(`${origin}/repack-devtools/faults`)).json();
    expect(list).toHaveLength(2);

    const removeOne = await fetch(
      `${origin}/repack-devtools/faults?id=${list[0].id}`,
      { method: 'DELETE' }
    );
    expect(await removeOne.json()).toEqual({ removed: 1 });
    const removeAll = await fetch(`${origin}/repack-devtools/faults`, {
      method: 'DELETE',
    });
    expect(await removeAll.json()).toEqual({ removed: 1 });
  });
});

describe('withRepackDevTools', () => {
  it('only changes dev server configs and adds middlewares once', async () => {
    const config = withRepackDevTools(() => ({
      plugins: [],
      devServer: {
        setupMiddlewares: (middlewares: unknown[], _devServer: unknown) => [
          ...middlewares,
          'user',
        ],
      },
    }));
    if (typeof config !== 'function') throw new Error('expected a function');

    const bundle = await config({ platform: 'ios', devServer: false });
    expect(bundle.plugins).toEqual([]);

    const start = await config({ platform: 'ios', devServer: { port: 8091 } });
    expect(start.plugins?.[0]).toBeInstanceOf(RepackDevToolsCollectorPlugin);
    const setup = start.devServer?.setupMiddlewares;
    const once = setup?.(['builtin'], {}) ?? [];
    expect(once).toHaveLength(5);
    expect(once.slice(3)).toEqual(['builtin', 'user']);
    expect(setup?.(once, {})).toHaveLength(6);
    expect(getDevServerStore().port).toBe(8091);
  });

  it('returns the config untouched when disabled', () => {
    const config = { plugins: [] };
    expect(withRepackDevTools(config, { enabled: false })).toBe(config);
  });
});
