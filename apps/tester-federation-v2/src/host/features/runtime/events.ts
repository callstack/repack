import { ScriptManager } from '@callstack/repack/client';

export type ScriptManagerCounts = {
  resolving: number;
  resolved: number;
  prefetching: number;
  loading: number;
  loaded: number;
  error: number;
  beforeResolve: number;
  resolve: number;
  afterResolve: number;
  beforeLoad: number;
  load: number;
  afterLoad: number;
};

const counts: ScriptManagerCounts = {
  resolving: 0,
  resolved: 0,
  prefetching: 0,
  loading: 0,
  loaded: 0,
  error: 0,
  beforeResolve: 0,
  resolve: 0,
  afterResolve: 0,
  beforeLoad: 0,
  load: 0,
  afterLoad: 0,
};

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
  'resolve',
  'afterResolve',
  'resolved',
];

const LOAD_STAGES: Array<keyof ScriptManagerCounts> = [
  'beforeLoad',
  'loading',
  'load',
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

export function registerEventCounter() {
  ScriptManager.shared.on('resolving', () => bump('resolving'));
  ScriptManager.shared.on('resolved', () => bump('resolved'));
  ScriptManager.shared.on('prefetching', () => bump('prefetching'));
  ScriptManager.shared.on('loading', () => bump('loading'));
  ScriptManager.shared.on('loaded', () => bump('loaded'));
  ScriptManager.shared.on('error', () => bump('error'));

  ScriptManager.shared.hooks.beforeResolve((args) => {
    bump('beforeResolve');
    return args;
  });

  ScriptManager.shared.hooks.resolve(async (args) => {
    bump('resolve');
    const { scriptId, caller, referenceUrl } = args.options;
    for (const [, , resolve] of args.resolvers) {
      const locator = await resolve(scriptId, caller, referenceUrl);
      if (locator) {
        return locator;
      }
    }
  });

  ScriptManager.shared.hooks.afterResolve((args) => {
    bump('afterResolve');
    return args;
  });

  ScriptManager.shared.hooks.beforeLoad((args) => {
    bump('beforeLoad');
    return args;
  });

  ScriptManager.shared.hooks.load(async (args) => {
    bump('load');
    await args.loadScript();
    return true;
  });

  ScriptManager.shared.hooks.afterLoad((args) => {
    bump('afterLoad');
    return args;
  });
}
