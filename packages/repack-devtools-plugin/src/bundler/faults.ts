import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  isRecord,
  readBoolean,
  readNumber,
  readString,
} from '../shared/guards.js';
import type { ServerFault } from '../shared/types.js';
import { getRequestPlatform } from './diagnostics.js';
import { type DevServerStore, getDevServerStore } from './store.js';

type Next = (error?: unknown) => void;

const MAX_FAULTS = 50;

const toMatcher = (match: string) => {
  const regex = /^\/(.+)\/([a-z]*)$/.exec(match);
  if (regex) {
    try {
      const pattern = new RegExp(regex[1], regex[2]);
      return (url: string) => pattern.test(url);
    } catch {
      // invalid regex: fall back to a substring match
    }
  }
  return (url: string) => url.includes(match);
};

/** Validates a fault definition received as JSON. */
export const parseServerFault = (
  input: unknown,
  store: DevServerStore
): ServerFault | string => {
  if (!isRecord(input)) return 'Expected a JSON object.';
  const match = readString(input, 'match');
  if (!match) return '`match` (URL substring or /regex/) is required.';
  const status = readNumber(input, 'status');
  const delayMs = readNumber(input, 'delayMs');
  const drop = readBoolean(input, 'drop');
  if (status === undefined && delayMs === undefined && !drop) {
    return 'Set at least one of `status`, `delayMs` or `drop`.';
  }
  if (status !== undefined && (status < 100 || status > 599)) {
    return '`status` must be an HTTP status code.';
  }
  store.seq += 1;
  return {
    id: `server-fault-${store.seq}`,
    match,
    method: readString(input, 'method')?.toUpperCase(),
    platform: readString(input, 'platform'),
    status,
    body: readString(input, 'body'),
    delayMs,
    drop,
    remaining: readNumber(input, 'times'),
    hits: 0,
    createdAt: Date.now(),
  };
};

export const addServerFault = (store: DevServerStore, fault: ServerFault) => {
  store.faults.push(fault);
  if (store.faults.length > MAX_FAULTS) store.faults.shift();
  return fault;
};

export const findServerFault = (
  store: DevServerStore,
  method: string,
  url: string
) =>
  store.faults.find(
    (fault) =>
      (fault.remaining === undefined || fault.remaining > 0) &&
      (!fault.method || fault.method === method) &&
      (!fault.platform || fault.platform === getRequestPlatform(url)) &&
      toMatcher(fault.match)(url)
  );

/** Marks a response as produced by a fault, for the request log. */
export const FAULT_HEADER = 'x-repack-devtools-fault';

/**
 * Applies injected faults to matching requests: delays them, answers with
 * the configured status, or drops the connection. Tooling routes are never
 * faulted (the caller skips them).
 */
export const applyServerFault = (
  req: IncomingMessage,
  res: ServerResponse,
  next: Next,
  store: DevServerStore = getDevServerStore()
) => {
  const fault = findServerFault(store, req.method ?? 'GET', req.url ?? '');
  if (!fault) return next();
  fault.hits += 1;
  if (fault.remaining !== undefined) fault.remaining -= 1;
  res.setHeader(FAULT_HEADER, fault.id);

  const respond = () => {
    if (fault.drop) {
      req.socket.destroy();
      return;
    }
    if (fault.status === undefined) return next();
    res.statusCode = fault.status;
    res.setHeader('Content-Type', 'text/plain');
    res.end(
      fault.body ??
        `Injected fault ${fault.id}: ${fault.status} for ${req.method} ${fault.match}`
    );
  };
  if (fault.delayMs) setTimeout(respond, fault.delayMs);
  else respond();
};
