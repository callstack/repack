import { ScriptManager } from '@callstack/repack/client';
import {
  callMethod,
  getProp,
  readArray,
  readGlobal,
  readString,
} from '../shared/guards';
import { attachGlobalErrorHandler } from './errorRecorder';
import {
  createRepackDevToolsRuntimePlugin,
  RUNTIME_PLUGIN_NAME,
} from './federation/runtimePlugin';
import { attachScriptManager } from './scriptManagerRecorder';
import { getStore } from './store';

const hasRuntimePlugin = (plugins: unknown[]) =>
  plugins.some((plugin) => readString(plugin, 'name') === RUNTIME_PLUGIN_NAME);

/**
 * Registers the MF runtime plugin on running Module Federation 2 instances
 * (and globally, for containers initialised later). Instances that already
 * got it through `runtimePlugins` are skipped.
 */
export const attachFederationRuntime = () => {
  const federation = readGlobal('__FEDERATION__');
  if (!federation) return false;
  const store = getStore();
  let plugin: ReturnType<typeof createRepackDevToolsRuntimePlugin> | undefined;
  const getPlugin = () => {
    plugin ??= createRepackDevToolsRuntimePlugin();
    return plugin;
  };

  for (const instance of readArray(federation, '__INSTANCES__')) {
    if (store.hooked.federationInstances.has(instance)) continue;
    store.hooked.federationInstances.add(instance);
    if (hasRuntimePlugin(readArray(getProp(instance, 'options'), 'plugins'))) {
      continue;
    }
    callMethod(instance, 'registerPlugins', [[getPlugin()]]);
  }

  const globalPlugins = getProp(federation, '__GLOBAL_PLUGIN__');
  if (Array.isArray(globalPlugins) && !hasRuntimePlugin(globalPlugins)) {
    globalPlugins.push(getPlugin());
  }
  return true;
};

export type InstallOptions = {
  /**
   * Set when called from the app entry file, before the first render, so the
   * overview can tell agents that startup events were captured.
   */
  boot?: boolean;
};

/**
 * Starts recording ScriptManager events, uncaught errors and Module
 * Federation lifecycle events. Safe to call more than once; call it at the
 * top of the app entry file to capture startup.
 */
export const installRepackDevTools = (options: InstallOptions = {}) => {
  const store = getStore();
  if (options.boot) store.bootRecording = true;
  try {
    attachScriptManager(ScriptManager.shared);
  } catch {
    // ScriptManager is unavailable outside Re.Pack bundles
  }
  attachGlobalErrorHandler(readGlobal('ErrorUtils'));
  try {
    attachFederationRuntime();
  } catch {
    // MF runtime shape changed; state reads still work without events
  }
};
