import type {
  ErrorRow,
  FederationEventRow,
  ScriptCallRow,
  ScriptEventRow,
  ScriptRow,
} from '../shared/agent-tools';
import type {
  FederationEvent,
  RecordedError,
  ScriptCall,
  ScriptEvent,
  ScriptRecord,
} from '../shared/types';

export const toScriptRow = (record: ScriptRecord): ScriptRow => ({
  uniqueId: record.uniqueId,
  scriptId: record.scriptId,
  caller: record.caller ?? '',
  status: record.status,
  source:
    record.locator?.fetch === undefined
      ? ''
      : record.locator.fetch
        ? 'download'
        : 'cache',
  url: record.locator?.url ?? '',
  loadCount: record.loadCount,
  resolveMs: record.resolveMs ?? null,
  loadMs: record.loadMs ?? null,
  error: record.error
    ? [record.error.stage, record.error.code, record.error.nativeMessage]
        .filter(Boolean)
        .join(': ')
    : '',
});

export const toScriptEventRow = (event: ScriptEvent): ScriptEventRow => ({
  seq: event.seq,
  at: event.at,
  type: event.type,
  uniqueId: event.uniqueId ?? '',
  url: event.url ?? '',
  detail: event.detail ?? '',
});

export const toScriptCallRow = (call: ScriptCall): ScriptCallRow => ({
  seq: call.seq,
  at: call.startedAt,
  method: call.method,
  uniqueId: call.uniqueId ?? call.scriptIds?.join(',') ?? '',
  outcome: call.outcome,
  durationMs: call.durationMs ?? null,
  resolverRan: call.resolverRan,
  joined: call.joined
    ? `${call.joined.state} ${call.joined.isPrefetch ? 'prefetch' : 'load'}`
    : '',
  events: call.events.join(','),
  error: call.error ?? '',
  faults: call.faults.join(','),
});

export const toFederationEventRow = (
  event: FederationEvent
): FederationEventRow => ({
  seq: event.seq,
  at: event.at,
  type: event.type,
  instance: event.instance ?? '',
  id: event.id ?? '',
  remote: event.remote ?? '',
  url: event.url ?? '',
  version: event.version ?? '',
  error: event.error ?? '',
  detail: event.detail ?? '',
});

export const toErrorRow = (error: RecordedError): ErrorRow => ({
  id: error.id,
  at: error.at,
  source: error.source,
  name: error.name ?? '',
  message: error.message,
  isFatal: Boolean(error.isFatal),
  ref: error.ref ?? '',
});
