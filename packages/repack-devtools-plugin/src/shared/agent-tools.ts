import {
  type AgentToolContract,
  defineAgentToolContract,
  definePaginatedAgentToolContract,
  type PageEnvelope,
} from '@rozenite/agent-shared';
import { PLUGIN_ID } from './constants';
import type {
  DevServerState,
  FederationEventType,
  FederationState,
  Overview,
  RecordedError,
  RecordedErrorSource,
  ScriptCall,
  ScriptCallMethod,
  ScriptEvent,
  ScriptEventType,
  ScriptFault,
  ScriptManagerState,
  ScriptRecord,
  ScriptStatus,
  ServerFault,
  SymbolicationResult,
} from './types';

export const REPACK_DEVTOOLS_AGENT_PLUGIN_ID = PLUGIN_ID;

type PageArgs = { limit?: number; cursor?: string };

const pageProperties = {
  limit: {
    type: 'number',
    description: 'Rows per page (default 20, max 100).',
  },
  cursor: {
    type: 'string',
    description: 'Cursor from the previous page (`page.nextCursor`).',
  },
} as const;

export type ScriptRow = {
  uniqueId: string;
  scriptId: string;
  caller: string;
  status: ScriptStatus;
  /** `download` when fetched over the network, `cache` when reused from the device. */
  source: string;
  url: string;
  loadCount: number;
  resolveMs: number | null;
  loadMs: number | null;
  error: string;
};

export type ActionResult<T = unknown> = {
  ok: boolean;
  durationMs: number;
  error?: string;
  result?: T;
};

export type ScriptActionResult = ActionResult & { record?: ScriptRecord };

export type FederationEventRow = {
  seq: number;
  at: number;
  type: FederationEventType;
  instance: string;
  id: string;
  remote: string;
  url: string;
  version: string;
  error: string;
  detail: string;
};

export type ScriptEventRow = {
  seq: number;
  at: number;
  type: ScriptEventType;
  uniqueId: string;
  url: string;
  detail: string;
};

export type ScriptCallRow = {
  seq: number;
  at: number;
  method: ScriptCallMethod;
  uniqueId: string;
  outcome: ScriptCall['outcome'];
  durationMs: number | null;
  resolverRan: boolean;
  /** `<pending|fulfilled|rejected> <load|prefetch>` when an earlier attempt was reused. */
  joined: string;
  events: string;
  error: string;
  faults: string;
};

export type ErrorRow = {
  id: string;
  at: number;
  source: RecordedErrorSource;
  name: string;
  message: string;
  isFatal: boolean;
  ref: string;
};

export type ListScriptsArgs = PageArgs & {
  status?: ScriptStatus;
  search?: string;
};
export type ListScriptsResult = {
  items: ScriptRow[];
  page: PageEnvelope;
  total: number;
};

export type ListScriptEventsArgs = PageArgs & {
  uniqueId?: string;
  since?: number;
};
export type ListScriptEventsResult = {
  items: ScriptEventRow[];
  page: PageEnvelope;
  total: number;
};

export type ListFederationEventsArgs = PageArgs & {
  type?: FederationEventType;
  errorsOnly?: boolean;
};
export type ListFederationEventsResult = {
  items: FederationEventRow[];
  page: PageEnvelope;
  total: number;
};

export type ListScriptCallsArgs = PageArgs & {
  uniqueId?: string;
  method?: ScriptCallMethod;
  errorsOnly?: boolean;
};
export type ListScriptCallsResult = {
  items: ScriptCallRow[];
  page: PageEnvelope;
  total: number;
};

export type InjectScriptFaultArgs = {
  stage: 'resolve' | 'load';
  scriptId?: string;
  caller?: string;
  action?: 'fail' | 'delay';
  message?: string;
  code?: string;
  delayMs?: number;
  times?: number;
};

export type InjectServerFaultArgs = {
  match: string;
  origin?: string;
  method?: string;
  platform?: string;
  status?: number;
  body?: string;
  delayMs?: number;
  drop?: boolean;
  times?: number;
};

export type FaultList = {
  app: ScriptFault[];
  servers: Array<{ origin: string; faults: ServerFault[]; error?: string }>;
};

export type ListErrorsArgs = PageArgs & { source?: RecordedErrorSource };
export type ListErrorsResult = {
  items: ErrorRow[];
  page: PageEnvelope;
  total: number;
};

export type GetScriptResult = {
  record: ScriptRecord;
  events: ScriptEvent[];
  errors: RecordedError[];
};

export type GetDevServerArgs = {
  origin?: string;
  requests?: 'failed' | 'all' | 'none';
};

const SCRIPT_STATUSES: ScriptStatus[] = [
  'resolving',
  'resolved',
  'prefetching',
  'prefetched',
  'loading',
  'loaded',
  'failed',
  'invalidated',
];

export const repackDevToolsToolDefinitions = {
  getOverview: defineAgentToolContract<{ devServer?: boolean }, Overview>({
    name: 'get-overview',
    description:
      'Start here. App/dev-server info, record counts and a severity-sorted list of diagnostics across ScriptManager, Module Federation, uncaught errors, compilation and dev-server requests. Each diagnostic has a `ref` to fetch details with the other tools.',
    readOnly: true,
    idempotent: true,
    inputSchema: {
      type: 'object',
      properties: {
        devServer: {
          type: 'boolean',
          description:
            'Also query the dev server state endpoint (default true).',
        },
      },
    },
  }),

  listScripts: definePaginatedAgentToolContract<
    ListScriptsArgs,
    ListScriptsResult
  >({
    name: 'list-scripts',
    description:
      'List scripts (chunks, MF containers) ScriptManager resolved or loaded, in first-seen order, with status, download-vs-cache source, timings and error.',
    readOnly: true,
    idempotent: true,
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: SCRIPT_STATUSES },
        search: {
          type: 'string',
          description: 'Case-insensitive match on unique id or URL.',
        },
        ...pageProperties,
      },
    },
    pagination: {
      kind: 'cursor',
      fields: [
        'uniqueId',
        'scriptId',
        'caller',
        'status',
        'source',
        'url',
        'loadCount',
        'resolveMs',
        'loadMs',
        'error',
      ],
      defaultFields: ['uniqueId', 'status', 'source', 'loadMs', 'error'],
      meta: ['total'],
    },
  }),

  getScript: defineAgentToolContract<{ uniqueId: string }, GetScriptResult>({
    name: 'get-script',
    description:
      'Full record of one script: normalized locator (URL, query, headers, fetch/cache flags), timings, error with native message, its event timeline and related errors.',
    readOnly: true,
    idempotent: true,
    inputSchema: {
      type: 'object',
      properties: {
        uniqueId: {
          type: 'string',
          description:
            'Unique id from list-scripts (`<caller>_<scriptId>`); a bare script id also works.',
        },
      },
      required: ['uniqueId'],
    },
  }),

  listScriptEvents: definePaginatedAgentToolContract<
    ListScriptEventsArgs,
    ListScriptEventsResult
  >({
    name: 'list-script-events',
    description:
      'Chronological ScriptManager events (resolving, resolved, prefetching, loading, loaded, error, invalidated).',
    readOnly: true,
    idempotent: true,
    inputSchema: {
      type: 'object',
      properties: {
        uniqueId: { type: 'string' },
        since: {
          type: 'number',
          description: 'Only events at or after this epoch-ms timestamp.',
        },
        ...pageProperties,
      },
    },
    pagination: {
      kind: 'cursor',
      fields: ['seq', 'at', 'type', 'uniqueId', 'url', 'detail'],
      defaultFields: ['seq', 'type', 'uniqueId', 'detail'],
      meta: ['total'],
    },
  }),

  loadScript: defineAgentToolContract<
    { scriptId: string; caller?: string },
    ScriptActionResult
  >({
    name: 'load-script',
    description:
      'Call ScriptManager.shared.loadScript(scriptId, caller) in the app and return the outcome plus the resulting record. Use to reproduce chunk loading failures without driving the UI.',
    readOnly: false,
    inputSchema: {
      type: 'object',
      properties: {
        scriptId: { type: 'string' },
        caller: { type: 'string' },
      },
      required: ['scriptId'],
    },
  }),

  prefetchScript: defineAgentToolContract<
    { scriptId: string; caller?: string },
    ScriptActionResult
  >({
    name: 'prefetch-script',
    description:
      'Call ScriptManager.shared.prefetchScript(scriptId, caller): download without executing.',
    readOnly: false,
    idempotent: true,
    inputSchema: {
      type: 'object',
      properties: {
        scriptId: { type: 'string' },
        caller: { type: 'string' },
      },
      required: ['scriptId'],
    },
  }),

  invalidateScripts: defineAgentToolContract<
    { scriptIds?: string },
    ActionResult<string[]>
  >({
    name: 'invalidate-scripts',
    description:
      'Call ScriptManager.shared.invalidateScripts: clears cache entries and downloaded files so the next load downloads again.',
    readOnly: false,
    destructive: true,
    idempotent: true,
    inputSchema: {
      type: 'object',
      properties: {
        scriptIds: {
          type: 'string',
          description:
            'Comma-separated cache keys (unique ids). Omit to invalidate everything.',
        },
      },
    },
  }),

  listScriptCalls: definePaginatedAgentToolContract<
    ListScriptCallsArgs,
    ListScriptCallsResult
  >({
    name: 'list-script-calls',
    description:
      'Every loadScript/prefetchScript/invalidateScripts call into ScriptManager.shared (app code, chunk runtime, MF, devtools actions) with outcome and duration. `resolverRan=false` plus a `joined` earlier attempt means ScriptManager returned a stored promise instead of trying again; use it to check retry, dedup and cache behaviour.',
    readOnly: true,
    idempotent: true,
    inputSchema: {
      type: 'object',
      properties: {
        uniqueId: {
          type: 'string',
          description: 'Unique id (`<caller>_<scriptId>`) or bare script id.',
        },
        method: {
          type: 'string',
          enum: ['loadScript', 'prefetchScript', 'invalidateScripts'],
        },
        errorsOnly: { type: 'boolean' },
        ...pageProperties,
      },
    },
    pagination: {
      kind: 'cursor',
      fields: [
        'seq',
        'at',
        'method',
        'uniqueId',
        'outcome',
        'durationMs',
        'resolverRan',
        'joined',
        'events',
        'error',
        'faults',
      ],
      defaultFields: [
        'seq',
        'method',
        'uniqueId',
        'outcome',
        'durationMs',
        'resolverRan',
        'joined',
        'error',
        'faults',
      ],
      meta: ['total'],
    },
  }),

  getScriptManager: defineAgentToolContract<undefined, ScriptManagerState>({
    name: 'get-script-manager',
    description:
      'ScriptManager internals: stored load/prefetch promises with their state (a stored rejected promise is returned to every later call), registered resolvers with priorities, taps per hook, locator cache entries and whether storage is set. Diagnostics flag stored rejected promises.',
    readOnly: true,
    idempotent: true,
    inputSchema: { type: 'object', properties: {} },
  }),

  injectScriptFault: defineAgentToolContract<
    InjectScriptFaultArgs,
    ScriptFault
  >({
    name: 'inject-script-fault',
    description:
      'Make ScriptManager fail or stall for matching scripts, through its hooks, to test error handling and recovery without changing app code. `resolve` throws before resolvers run (like a resolver that fetches a manifest and goes offline); `load` throws before the download, with code NetworkFailure by default (loadScript only, not prefetchScript). Faults stay active until `times` hits are used or clear-faults is called.',
    readOnly: false,
    inputSchema: {
      type: 'object',
      properties: {
        stage: { type: 'string', enum: ['resolve', 'load'] },
        scriptId: {
          type: 'string',
          description: 'Exact script id; omit to match every script.',
        },
        caller: { type: 'string' },
        action: {
          type: 'string',
          enum: ['fail', 'delay'],
          description: 'Default fail. With delayMs, fail waits first.',
        },
        message: { type: 'string' },
        code: { type: 'string' },
        delayMs: { type: 'number' },
        times: {
          type: 'number',
          description: 'Number of matching calls to affect; omit for all.',
        },
      },
      required: ['stage'],
    },
  }),

  injectServerFault: defineAgentToolContract<
    InjectServerFaultArgs,
    ServerFault
  >({
    name: 'inject-server-fault',
    description:
      'Make a dev server answer matching requests with an error status, a delay, or a dropped connection, to test how the app handles failing chunk, asset, MF manifest or remote entry downloads. Works for any dev server wrapped with withRepackDevTools (pass `origin` for MF remotes). Responses it produces are marked with `fault` in the request log.',
    readOnly: false,
    inputSchema: {
      type: 'object',
      properties: {
        match: {
          type: 'string',
          description:
            'Substring of the request URL, or a /regex/ (e.g. "/miniapp/" or "/mf-manifest\\.json/").',
        },
        origin: {
          type: 'string',
          description:
            'Dev server origin; defaults to the server that served the app.',
        },
        method: { type: 'string' },
        platform: { type: 'string' },
        status: { type: 'number', description: 'HTTP status to answer with.' },
        body: { type: 'string' },
        delayMs: {
          type: 'number',
          description: 'Wait before answering (or before serving normally).',
        },
        drop: {
          type: 'boolean',
          description: 'Destroy the connection without a response.',
        },
        times: {
          type: 'number',
          description: 'Number of matching requests to affect; omit for all.',
        },
      },
      required: ['match'],
    },
  }),

  listFaults: defineAgentToolContract<{ origin?: string }, FaultList>({
    name: 'list-faults',
    description:
      'Active injected faults in the app and on the dev server (plus `origin` if given), with hit counts.',
    readOnly: true,
    idempotent: true,
    inputSchema: {
      type: 'object',
      properties: {
        origin: {
          type: 'string',
          description: 'Additional dev server origin to query.',
        },
      },
    },
  }),

  clearFaults: defineAgentToolContract<
    { id?: string; origin?: string },
    { removed: number }
  >({
    name: 'clear-faults',
    description:
      'Remove injected faults from the app and the dev server (plus `origin` if given). Pass `id` to remove one.',
    readOnly: false,
    destructive: true,
    idempotent: true,
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        origin: { type: 'string' },
      },
    },
  }),

  getFederation: defineAgentToolContract<undefined, FederationState>({
    name: 'get-federation',
    description:
      'Module Federation state: runtime (v1/v2), instances with remotes and loaded modules, shared packages per scope with registered/loaded versions, and diagnostics (duplicate singletons, requiredVersion mismatches, failed remote/manifest loads).',
    readOnly: true,
    idempotent: true,
    inputSchema: { type: 'object', properties: {} },
  }),

  listFederationEvents: definePaginatedAgentToolContract<
    ListFederationEventsArgs,
    ListFederationEventsResult
  >({
    name: 'list-federation-events',
    description:
      'Module Federation runtime lifecycle events recorded by the devtools runtime plugin (beforeRequest, afterResolve, onLoad, errorLoadRemote, afterLoadShare, afterLoadEntry, afterLoadManifest, ...).',
    readOnly: true,
    idempotent: true,
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        errorsOnly: { type: 'boolean' },
        ...pageProperties,
      },
    },
    pagination: {
      kind: 'cursor',
      fields: [
        'seq',
        'at',
        'type',
        'instance',
        'id',
        'remote',
        'url',
        'version',
        'error',
        'detail',
      ],
      defaultFields: ['seq', 'type', 'id', 'remote', 'error'],
      meta: ['total'],
    },
  }),

  loadRemote: defineAgentToolContract<
    { id: string; instance?: string },
    ActionResult<{ exportKeys: string[]; type: string }>
  >({
    name: 'load-remote',
    description:
      'Load a federated module (e.g. "MiniApp/MiniAppNavigator") through the MF runtime (v2: instance.loadRemote, v1: Federated.importModule) and report the outcome. Inspect list-federation-events and list-scripts afterwards.',
    readOnly: false,
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '"<remote>/<exposed module>"' },
        instance: {
          type: 'string',
          description: 'MF instance name; defaults to the first (host).',
        },
      },
      required: ['id'],
    },
  }),

  listErrors: definePaginatedAgentToolContract<
    ListErrorsArgs,
    ListErrorsResult
  >({
    name: 'list-errors',
    description:
      'Errors recorded in the app: uncaught JS errors (global handler, with isFatal), ScriptManager failures and MF load failures.',
    readOnly: true,
    idempotent: true,
    inputSchema: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          enum: ['global-handler', 'script-manager', 'federation'],
        },
        ...pageProperties,
      },
    },
    pagination: {
      kind: 'cursor',
      fields: ['id', 'at', 'source', 'name', 'message', 'isFatal', 'ref'],
      defaultFields: ['id', 'source', 'message', 'isFatal'],
      meta: ['total'],
    },
  }),

  getError: defineAgentToolContract<{ id: string }, RecordedError>({
    name: 'get-error',
    description:
      'One recorded error including its raw stack and component stack.',
    readOnly: true,
    idempotent: true,
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  }),

  symbolicate: defineAgentToolContract<
    { stack?: string; errorId?: string },
    SymbolicationResult
  >({
    name: 'symbolicate',
    description:
      "Symbolicate a stack through the dev server's /symbolicate exactly like LogBox does, and report frames that stayed unmapped plus the HTTP status of their source maps. Without arguments it symbolicates a probe stack from the app itself.",
    readOnly: true,
    idempotent: true,
    inputSchema: {
      type: 'object',
      properties: {
        stack: { type: 'string', description: 'Raw Hermes/JSC stack.' },
        errorId: {
          type: 'string',
          description: 'Recorded error id from list-errors.',
        },
      },
    },
  }),

  getDevServer: defineAgentToolContract<GetDevServerArgs, DevServerState>({
    name: 'get-dev-server',
    description:
      'Bundler/dev-server state from <origin>/repack-devtools/state: per-platform compilation status, errors, warnings, emitted assets, files changed in the last rebuild, and the request log (failed requests include the response body). Pass `origin` to query an MF remote dev server.',
    readOnly: true,
    idempotent: true,
    inputSchema: {
      type: 'object',
      properties: {
        origin: {
          type: 'string',
          description:
            'Dev server origin, e.g. http://localhost:8082. Defaults to the server that served the app.',
        },
        requests: {
          type: 'string',
          enum: ['failed', 'all', 'none'],
          description: 'Which requests to include (default failed).',
        },
      },
    },
  }),

  clear: defineAgentToolContract<
    { scope?: 'all' | 'scripts' | 'federation' | 'errors' },
    { cleared: string }
  >({
    name: 'clear',
    description:
      'Clear recorded data so the next reproduction starts clean. Does not touch the ScriptManager cache (use invalidate-scripts).',
    readOnly: false,
    destructive: true,
    idempotent: true,
    inputSchema: {
      type: 'object',
      properties: {
        scope: {
          type: 'string',
          enum: ['all', 'scripts', 'federation', 'errors'],
        },
      },
    },
  }),

  reload: defineAgentToolContract<undefined, { reloading: boolean }>({
    name: 'reload',
    description:
      'Reload the JS bundle (DevSettings.reload) to reproduce startup flows. Recorded data starts empty in the new JS runtime; startup is captured when the entry calls installRepackDevTools({ boot: true }). Wait a few seconds, then call get-overview again.',
    readOnly: false,
    destructive: true,
    inputSchema: { type: 'object', properties: {} },
  }),
} as const satisfies Record<string, AgentToolContract<unknown, unknown>>;
