import { callMethod, getProp, readString } from '../shared/guards';
import type { FaultStage, ScriptFault } from '../shared/types';
import { getStore, nextSeq, notify } from './store';

export type ScriptFaultInput = {
  stage: FaultStage;
  scriptId?: string;
  caller?: string;
  action?: 'fail' | 'delay';
  message?: string;
  code?: string;
  delayMs?: number;
  times?: number;
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const matches = (fault: ScriptFault, stage: FaultStage, options: unknown) =>
  fault.stage === stage &&
  (fault.remaining === undefined || fault.remaining > 0) &&
  (!fault.scriptId || fault.scriptId === readString(options, 'scriptId')) &&
  (!fault.caller || fault.caller === readString(options, 'caller'));

/**
 * Applies the first matching fault for a stage. Called from ScriptManager
 * hooks: `beforeResolve` (resolve stage, errors surface as "Failed while
 * resolving script locator") and `beforeLoad` (load stage, loadScript only,
 * errors surface as "Failed to load script" with the given code).
 */
export const applyScriptFault = async (stage: FaultStage, options: unknown) => {
  const store = getStore();
  const fault = store.faults.find((item) => matches(item, stage, options));
  if (!fault) return;
  fault.hits += 1;
  if (fault.remaining !== undefined) fault.remaining -= 1;
  const call = [...store.scriptCalls]
    .reverse()
    .find(
      (item) =>
        item.outcome === 'pending' &&
        item.scriptId === readString(options, 'scriptId')
    );
  call?.faults.push(fault.id);
  notify(store);
  if (fault.delayMs) await sleep(fault.delayMs);
  if (fault.action === 'fail') {
    throw Object.assign(new Error(fault.message), {
      code: fault.code,
      injectedFault: fault.id,
    });
  }
};

const installFaultHooks = (scriptManager: unknown) => {
  const store = getStore();
  if (store.hooked.faultHooks) return;
  const hooks = getProp(scriptManager, 'hooks');
  // Hooks cannot be removed, so they are only added once a fault is
  // injected; without active faults they pass their arguments through.
  callMethod(hooks, 'beforeResolve', [
    async (args: unknown) => {
      await applyScriptFault('resolve', getProp(args, 'options'));
      return args;
    },
  ]);
  callMethod(hooks, 'beforeLoad', [
    async (args: unknown) => {
      await applyScriptFault('load', getProp(args, 'options'));
      return args;
    },
  ]);
  store.hooked.faultHooks = true;
};

export const injectScriptFault = (
  scriptManager: unknown,
  input: ScriptFaultInput
): ScriptFault => {
  const store = getStore();
  installFaultHooks(scriptManager);
  const action = input.action ?? 'fail';
  const fault: ScriptFault = {
    id: `fault-${nextSeq(store)}`,
    stage: input.stage,
    scriptId: input.scriptId,
    caller: input.caller,
    action,
    message:
      input.message ??
      (input.stage === 'resolve'
        ? 'Network request failed (injected)'
        : 'Script download failed (injected)'),
    code: input.code ?? (input.stage === 'load' ? 'NetworkFailure' : undefined),
    delayMs: input.delayMs,
    remaining: input.times,
    hits: 0,
    createdAt: Date.now(),
  };
  store.faults.push(fault);
  notify(store);
  return fault;
};

export const listScriptFaults = () => getStore().faults;

export const clearScriptFaults = (id?: string) => {
  const store = getStore();
  const before = store.faults.length;
  store.faults = id ? store.faults.filter((item) => item.id !== id) : [];
  notify(store);
  return before - store.faults.length;
};
