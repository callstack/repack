import { Federated, ScriptManager } from '@callstack/repack/client';
import { DevSettings } from 'react-native';
import type { FaultList, InjectServerFaultArgs } from '../shared/agent-tools';
import { DEV_SERVER_ROUTE } from '../shared/constants';
import {
  callMethod,
  getProp,
  isDevServerState,
  isRecord,
  readArray,
  readGlobal,
  readNumber,
  readString,
} from '../shared/guards';
import { isFailedRequest } from '../shared/requests';
import type {
  DevServerState,
  DevServerSummary,
  Diagnostic,
  FederationState,
  Overview,
  RecordedError,
  ScriptCall,
  ScriptCallMethod,
  ScriptEvent,
  ScriptFault,
  ScriptRecord,
  ScriptStatus,
  ServerFault,
  SymbolicationResult,
} from '../shared/types';
import { diagnoseScriptCalls } from './callTracer';
import {
  getAppInfo,
  getDevServerOrigin,
  getFederationGlobals,
} from './environment';
import {
  clearScriptFaults,
  injectScriptFault,
  listScriptFaults,
  type ScriptFaultInput,
} from './faults';
import { readFederationState } from './federation/state';
import { inspectScriptManager } from './scriptManagerInspector';
import { type ClearScope, clearStore, describeError, getStore } from './store';
import { symbolicateStack } from './symbolication';

const STUCK_LOADING_MS = 15_000;

export const getFederation = (): FederationState =>
  readFederationState(getFederationGlobals());

export const listScripts = (
  filter: { status?: ScriptStatus; search?: string } = {}
): ScriptRecord[] => {
  const search = filter.search?.toLowerCase();
  return Array.from(getStore().scripts.values())
    .filter((record) => !filter.status || record.status === filter.status)
    .filter(
      (record) =>
        !search ||
        record.uniqueId.toLowerCase().includes(search) ||
        record.locator?.url?.toLowerCase().includes(search)
    )
    .sort((a, b) => a.firstSeenAt - b.firstSeenAt);
};

export const getScript = (uniqueId: string) => {
  const store = getStore();
  const record =
    store.scripts.get(uniqueId) ??
    Array.from(store.scripts.values()).find(
      (item) => item.scriptId === uniqueId
    );
  if (!record) {
    const known = Array.from(store.scripts.keys()).slice(0, 20).join(', ');
    throw new Error(
      `No script "${uniqueId}" was recorded. Known: ${known || '(none)'}`
    );
  }
  return {
    record,
    events: store.scriptEvents.filter(
      (event) => event.uniqueId === record.uniqueId
    ),
    errors: store.errors.filter((error) => error.ref === record.uniqueId),
  };
};

export const listScriptEvents = (
  filter: { since?: number; uniqueId?: string } = {}
): ScriptEvent[] =>
  getStore().scriptEvents.filter(
    (event) =>
      (filter.since === undefined || event.at >= filter.since) &&
      (!filter.uniqueId || event.uniqueId === filter.uniqueId)
  );

export const listScriptCalls = (
  filter: {
    uniqueId?: string;
    method?: ScriptCallMethod;
    errorsOnly?: boolean;
  } = {}
): ScriptCall[] =>
  getStore().scriptCalls.filter(
    (call) =>
      (!filter.uniqueId ||
        call.uniqueId === filter.uniqueId ||
        call.scriptId === filter.uniqueId ||
        call.scriptIds?.includes(filter.uniqueId)) &&
      (!filter.method || call.method === filter.method) &&
      (!filter.errorsOnly || call.outcome === 'error')
  );

export const getScriptManagerState = () =>
  inspectScriptManager(ScriptManager.shared);

const describeScriptFault = (fault: ScriptFault) =>
  [
    fault.action,
    fault.code,
    fault.delayMs ? `delay ${fault.delayMs}ms` : undefined,
    fault.remaining !== undefined ? `${fault.remaining} left` : undefined,
  ]
    .filter(Boolean)
    .join(', ');

const diagnoseScriptFaults = (faults: ScriptFault[]): Diagnostic[] =>
  faults
    .filter((fault) => fault.remaining === undefined || fault.remaining > 0)
    .map((fault) => ({
      severity: 'info',
      area: 'faults',
      message: `Injected ${fault.stage} fault ${fault.id} is active for ${fault.scriptId ? `"${fault.scriptId}"` : 'every script'} (${describeScriptFault(fault)}, ${fault.hits} hit(s)). Failures it causes are not real bugs.`,
      hint: 'Remove it with clear-faults.',
      ref: fault.id,
    }));

export const injectAppFault = (input: ScriptFaultInput) =>
  injectScriptFault(ScriptManager.shared, input);

const requireOrigin = (origin = getDevServerOrigin()) => {
  if (!origin) throw new Error('Dev server origin is unknown.');
  return origin;
};

const readErrorBody = async (response: Response) => {
  const body: unknown = await response.json().catch(() => undefined);
  return readString(body, 'error') ?? `HTTP ${response.status}`;
};

const isServerFault = (value: unknown): value is ServerFault =>
  readString(value, 'id') !== undefined &&
  readString(value, 'match') !== undefined &&
  readNumber(value, 'hits') !== undefined;

const faultsUrl = (origin: string) => `${origin}${DEV_SERVER_ROUTE}/faults`;

export const injectServerFault = async ({
  origin,
  ...fault
}: InjectServerFaultArgs): Promise<ServerFault> => {
  const url = faultsUrl(requireOrigin(origin));
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fault),
  });
  if (!response.ok) {
    throw new Error(`${url}: ${await readErrorBody(response)}`);
  }
  const body: unknown = await response.json();
  if (!isServerFault(body)) {
    throw new Error(`${url} returned an unexpected payload.`);
  }
  return body;
};

/** The app's dev server plus `origin`, without duplicates. */
const faultOrigins = (origin?: string) =>
  Array.from(
    new Set([getDevServerOrigin(), origin].filter((item) => item !== undefined))
  );

export const listFaults = async (origin?: string): Promise<FaultList> => ({
  app: listScriptFaults(),
  servers: await Promise.all(
    faultOrigins(origin).map(async (item) => {
      try {
        const response = await fetch(faultsUrl(item));
        if (!response.ok) {
          return {
            origin: item,
            faults: [],
            error: await readErrorBody(response),
          };
        }
        const body: unknown = await response.json();
        return {
          origin: item,
          faults: Array.isArray(body) ? body.filter(isServerFault) : [],
        };
      } catch (error) {
        return {
          origin: item,
          faults: [],
          error: describeError(error).message,
        };
      }
    })
  ),
});

export const clearFaults = async (id?: string, origin?: string) => {
  let removed = clearScriptFaults(id);
  const query = id ? `?id=${encodeURIComponent(id)}` : '';
  for (const item of faultOrigins(origin)) {
    try {
      const response = await fetch(`${faultsUrl(item)}${query}`, {
        method: 'DELETE',
      });
      const body: unknown = await response.json();
      removed += readNumber(body, 'removed') ?? 0;
    } catch {
      // an unreachable server has no faults to clear
    }
  }
  return { removed };
};

export const listErrors = (
  filter: { source?: RecordedError['source'] } = {}
): RecordedError[] =>
  getStore().errors.filter(
    (error) => !filter.source || error.source === filter.source
  );

const describeScriptFailure = (record: ScriptRecord) =>
  [
    record.error?.stage && `${record.error.stage} failed`,
    record.error?.code,
    record.error?.nativeMessage ?? record.error?.message,
  ]
    .filter(Boolean)
    .join(': ');

export const diagnoseScripts = (
  scripts: ScriptRecord[],
  now = Date.now()
): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  for (const record of scripts) {
    if (record.status === 'failed') {
      diagnostics.push({
        severity: 'error',
        area: 'scripts',
        message: `Script "${record.uniqueId}" failed (${describeScriptFailure(record)})${record.locator?.url ? ` from ${record.locator.url}` : ''}.`,
        hint:
          record.error?.stage === 'resolve'
            ? 'No resolver returned a locator; check ScriptManager.shared.addResolver and the caller/scriptId pair.'
            : 'Check the URL in the dev server request log (get-dev-server) and whether the chunk exists in the compilation assets.',
        ref: record.uniqueId,
      });
    } else if (
      record.status === 'loading' &&
      record.loadStartedAt !== undefined &&
      now - record.loadStartedAt > STUCK_LOADING_MS
    ) {
      diagnostics.push({
        severity: 'warning',
        area: 'scripts',
        message: `Script "${record.uniqueId}" has been loading for ${Math.round((now - record.loadStartedAt) / 1000)}s.`,
        hint: 'The native download or evaluation never settled; check device logs and the request log for this URL.',
        ref: record.uniqueId,
      });
    }
  }
  return diagnostics;
};

export const fetchDevServerState = async (
  origin = getDevServerOrigin()
): Promise<DevServerState> => {
  if (!origin) throw new Error('Dev server origin is unknown.');
  let response: Response;
  try {
    response = await fetch(`${origin}${DEV_SERVER_ROUTE}/state`);
  } catch (error) {
    throw new Error(
      `Dev server ${origin} is not reachable from the device (${String(error)}). Is it running, and is the port forwarded (adb reverse)?`
    );
  }
  if (!response.ok) {
    throw new Error(
      `${origin}${DEV_SERVER_ROUTE}/state responded with ${response.status}. Is the config wrapped with withRepackDevTools?`
    );
  }
  const body: unknown = await response.json();
  if (!isDevServerState(body)) {
    throw new Error(
      `${origin}${DEV_SERVER_ROUTE}/state returned an unexpected payload.`
    );
  }
  return body;
};

const summarizeDevServer = async (
  origin: string | undefined
): Promise<{ summary?: DevServerSummary; diagnostics: Diagnostic[] }> => {
  if (!origin) return { diagnostics: [] };
  try {
    const state = await fetchDevServerState(origin);
    return {
      summary: {
        origin,
        reachable: true,
        platforms: state.compilations.map((compilation) => ({
          platform: compilation.platform,
          status: compilation.status,
          errors: compilation.errorCount,
          warnings: compilation.warningCount,
        })),
        failedRequests: state.requests.filter(isFailedRequest).length,
      },
      diagnostics: state.diagnostics,
    };
  } catch (error) {
    return {
      summary: {
        origin,
        reachable: false,
        error: describeError(error).message,
        platforms: [],
        failedRequests: 0,
      },
      diagnostics: [],
    };
  }
};

const SEVERITY_ORDER = { error: 0, warning: 1, info: 2 } as const;

export const getOverview = async (
  options: { devServer?: boolean } = {}
): Promise<Overview> => {
  const store = getStore();
  const app = getAppInfo();
  const scripts = Array.from(store.scripts.values());
  const federation = getFederation();
  const [devServer, scriptManager] = await Promise.all([
    options.devServer === false
      ? summarizeDevServer(undefined)
      : summarizeDevServer(app.devServer),
    getScriptManagerState().catch(() => undefined),
  ]);

  const diagnostics: Diagnostic[] = [
    ...diagnoseScriptFaults(store.faults),
    ...diagnoseScripts(scripts),
    ...(scriptManager?.diagnostics ?? []),
    ...diagnoseScriptCalls(store.scriptCalls),
    ...federation.diagnostics,
    ...store.errors
      .filter((error) => error.isFatal)
      .map(
        (error): Diagnostic => ({
          severity: 'error',
          area: 'errors',
          message: `Fatal error: ${error.message}`,
          hint: 'Run symbolicate with this error id to map the stack to sources.',
          ref: error.id,
        })
      ),
    ...devServer.diagnostics,
  ];

  if (!store.bootRecording) {
    diagnostics.push({
      severity: 'info',
      area: 'scripts',
      message:
        'Recording started after the first render, so startup ScriptManager and MF events may be missing.',
      hint: 'Call installRepackDevTools({ boot: true }) at the top of the app entry file.',
    });
  }

  diagnostics.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );

  return {
    app,
    counts: {
      scripts: scripts.length,
      failedScripts: scripts.filter((record) => record.status === 'failed')
        .length,
      scriptEvents: store.scriptEvents.length,
      scriptCalls: store.scriptCalls.length,
      federationEvents: store.federationEvents.length,
      errors: store.errors.length,
    },
    federationRuntime: federation.runtime,
    diagnostics,
    devServer: devServer.summary,
  };
};

type ActionResult<T = undefined> = {
  ok: boolean;
  durationMs: number;
  error?: string;
  result?: T;
};

const runAction = async <T>(
  action: () => Promise<T>
): Promise<ActionResult<T>> => {
  const startedAt = Date.now();
  try {
    const result = await action();
    return { ok: true, durationMs: Date.now() - startedAt, result };
  } catch (error) {
    return {
      ok: false,
      durationMs: Date.now() - startedAt,
      error: describeError(error).message,
    };
  }
};

const withRecord = async <T>(
  scriptId: string,
  caller: string | undefined,
  action: () => Promise<T>
) => {
  const result = await runAction(action);
  const uniqueId = (caller ? `${caller}_` : '') + scriptId;
  return { ...result, record: getStore().scripts.get(uniqueId) };
};

export const loadScript = (scriptId: string, caller?: string) =>
  withRecord(scriptId, caller, () =>
    ScriptManager.shared.loadScript(scriptId, caller)
  );

export const prefetchScript = (scriptId: string, caller?: string) =>
  withRecord(scriptId, caller, () =>
    ScriptManager.shared.prefetchScript(scriptId, caller)
  );

export const invalidateScripts = (scriptIds?: string[]) =>
  runAction(async () =>
    ScriptManager.shared.invalidateScripts(scriptIds ?? [])
  );

/**
 * Loads `<remote>/<exposed module>` through the MF runtime (v2) or
 * `Federated.importModule` (v1), the same way app code would.
 */
export const loadRemote = (id: string, instanceName?: string) =>
  runAction(async () => {
    const instances = readArray(readGlobal('__FEDERATION__'), '__INSTANCES__');
    let exports: unknown;
    if (instances.length > 0) {
      const instance = instanceName
        ? instances.find((item) => readString(item, 'name') === instanceName)
        : instances[0];
      if (typeof getProp(instance, 'loadRemote') !== 'function') {
        throw new Error(
          `No MF instance named "${instanceName}". Available: ${instances.map((item) => readString(item, 'name')).join(', ')}`
        );
      }
      exports = await callMethod(instance, 'loadRemote', [id]);
    } else {
      const [container, ...rest] = id.split('/');
      if (!container || rest.length === 0) {
        throw new Error('Expected "<container>/<module>", e.g. "MiniApp/App".');
      }
      exports = await Federated.importModule(container, `./${rest.join('/')}`);
    }
    if (exports === null || exports === undefined) {
      throw new Error(`Remote "${id}" resolved to ${String(exports)}.`);
    }
    return {
      exportKeys: isRecord(exports) ? Object.keys(exports) : [],
      type: typeof exports,
    };
  });

export const symbolicate = async (input: {
  stack?: string;
  errorId?: string;
}): Promise<SymbolicationResult> => {
  let stack = input.stack;
  if (!stack && input.errorId) {
    const error = getStore().errors.find((item) => item.id === input.errorId);
    if (!error) throw new Error(`No recorded error "${input.errorId}".`);
    if (!error.stack) {
      throw new Error(`Recorded error "${input.errorId}" has no stack.`);
    }
    stack = error.stack;
  }
  if (!stack) {
    stack = new Error('repack-devtools symbolication probe').stack ?? '';
  }
  return symbolicateStack(stack, { devServer: getDevServerOrigin() });
};

export const clear = (scope: ClearScope = 'all') => {
  clearStore(scope);
  return { cleared: scope };
};

export const reload = () => {
  setTimeout(() => DevSettings.reload('repack-devtools'), 50);
  return { reloading: true };
};
