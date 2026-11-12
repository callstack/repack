import { ScriptManager } from '@callstack/repack/client';

export const EVENT_NAMES = [
  'resolving',
  'resolved',
  'prefetching',
  'loading',
  'loaded',
  'error',
  'beforeResolve',
  'afterResolve',
  'beforeLoad',
  'afterLoad',
] as const;

export type ScriptManagerCounts = Record<(typeof EVENT_NAMES)[number], number>;

const counts = Object.fromEntries(
  EVENT_NAMES.map((name) => [name, 0])
) as ScriptManagerCounts;

const listeners = new Set<(counts: ScriptManagerCounts) => void>();

export function subscribeEventCounts(
  listener: (counts: ScriptManagerCounts) => void
) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function readEventCounts(): ScriptManagerCounts {
  return { ...counts };
}

function bump(key: keyof ScriptManagerCounts) {
  counts[key] += 1;
  for (const listener of listeners) {
    listener(readEventCounts());
  }
}

const RESOLVE_STAGES: Array<keyof ScriptManagerCounts> = [
  'beforeResolve',
  'resolving',
  'afterResolve',
  'resolved',
];

const LOAD_STAGES: Array<keyof ScriptManagerCounts> = [
  'beforeLoad',
  'loading',
  'afterLoad',
  'loaded',
];

export type PipelineStatus = {
  settled: boolean;
  label: string;
};

function findStuckStage(
  counts: ScriptManagerCounts,
  stages: Array<keyof ScriptManagerCounts>,
  expected: number
) {
  const stage = stages.find((name) => counts[name] !== expected);
  return stage === undefined ? undefined : { stage, expected };
}

export function getPipelineStatus(counts: ScriptManagerCounts): PipelineStatus {
  if (counts.error > 0) {
    return { settled: false, label: `error=${counts.error}` };
  }

  if (counts.beforeResolve === 0) {
    return { settled: false, label: 'idle' };
  }

  const loaded = counts.beforeResolve - counts.prefetching;

  const stuck =
    findStuckStage(counts, RESOLVE_STAGES, counts.beforeResolve) ??
    findStuckStage(counts, LOAD_STAGES, loaded);

  if (stuck === undefined) {
    return { settled: true, label: 'settled' };
  }

  return {
    settled: false,
    label: `${stuck.stage}=${counts[stuck.stage]} of ${stuck.expected}`,
  };
}

function countEvent(event: keyof ScriptManagerCounts) {
  return (...args: unknown[]) => {
    console.debug(`ScriptManagerEvent:${event}`, ...args);
    bump(event);
  };
}

export function registerEventCounter() {
  ScriptManager.shared.on('resolving', countEvent('resolving'));
  ScriptManager.shared.on('resolved', countEvent('resolved'));
  ScriptManager.shared.on('prefetching', countEvent('prefetching'));
  ScriptManager.shared.on('loading', countEvent('loading'));
  ScriptManager.shared.on('loaded', countEvent('loaded'));
  ScriptManager.shared.on('error', countEvent('error'));
  ScriptManager.shared.on('invalidated', (scriptIds) => {
    console.debug('ScriptManagerEvent:invalidated', scriptIds);
  });

  ScriptManager.shared.hooks.beforeResolve((args) => {
    console.debug('ScriptManager.shared.hooks.beforeResolve', args.options);
    bump('beforeResolve');
    return args;
  });

  ScriptManager.shared.hooks.afterResolve((args) => {
    console.debug('ScriptManager.shared.hooks.afterResolve', args.options);
    bump('afterResolve');
    return args;
  });

  ScriptManager.shared.hooks.beforeLoad((args) => {
    console.debug('ScriptManager.shared.hooks.beforeLoad', args.options);
    bump('beforeLoad');
    return args;
  });

  ScriptManager.shared.hooks.afterLoad((args) => {
    console.debug('ScriptManager.shared.hooks.afterLoad', args.options);
    bump('afterLoad');
    return args;
  });
}
