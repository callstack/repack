import {
  paginateArray,
  useRozenitePluginAgentTool,
} from '@rozenite/agent-bridge';
import {
  REPACK_DEVTOOLS_AGENT_PLUGIN_ID as pluginId,
  repackDevToolsToolDefinitions as tools,
} from '../shared/agent-tools';
import { isFailedRequest } from '../shared/requests';
import {
  clear,
  clearFaults,
  fetchDevServerState,
  getFederation,
  getOverview,
  getScript,
  getScriptManagerState,
  injectAppFault,
  injectServerFault,
  invalidateScripts,
  listErrors,
  listFaults,
  listScriptCalls,
  listScriptEvents,
  listScripts,
  loadRemote,
  loadScript,
  prefetchScript,
  reload,
  symbolicate,
} from './api';
import {
  toErrorRow,
  toFederationEventRow,
  toScriptCallRow,
  toScriptEventRow,
  toScriptRow,
} from './rows';
import { getStore } from './store';

/**
 * Registers the `callstack/repack-devtools` agent domain. Every tool reads or
 * drives the same state as the DevTools panels.
 */
export const useRepackDevToolsAgentTools = () => {
  useRozenitePluginAgentTool({
    pluginId,
    tool: tools.getOverview,
    handler: (args) => getOverview({ devServer: args?.devServer }),
  });

  useRozenitePluginAgentTool({
    pluginId,
    tool: tools.listScripts,
    handler: ({ status, search, limit, cursor } = {}) => {
      const rows = listScripts({ status, search }).map(toScriptRow);
      return {
        ...paginateArray(rows, {
          keyOf: (row) => row.uniqueId,
          limit,
          cursor,
          scope: `${status ?? ''}|${search ?? ''}`,
        }),
        total: rows.length,
      };
    },
  });

  useRozenitePluginAgentTool({
    pluginId,
    tool: tools.getScript,
    handler: ({ uniqueId }) => getScript(uniqueId),
  });

  useRozenitePluginAgentTool({
    pluginId,
    tool: tools.listScriptEvents,
    handler: ({ uniqueId, since, limit, cursor } = {}) => {
      const rows = listScriptEvents({ uniqueId, since }).map(toScriptEventRow);
      return {
        ...paginateArray(rows, {
          keyOf: (row) => String(row.seq),
          limit,
          cursor,
          scope: `${uniqueId ?? ''}|${since ?? ''}`,
        }),
        total: rows.length,
      };
    },
  });

  useRozenitePluginAgentTool({
    pluginId,
    tool: tools.loadScript,
    handler: ({ scriptId, caller }) => loadScript(scriptId, caller),
  });

  useRozenitePluginAgentTool({
    pluginId,
    tool: tools.prefetchScript,
    handler: ({ scriptId, caller }) => prefetchScript(scriptId, caller),
  });

  useRozenitePluginAgentTool({
    pluginId,
    tool: tools.invalidateScripts,
    handler: ({ scriptIds } = {}) =>
      invalidateScripts(
        scriptIds
          ?.split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      ),
  });

  useRozenitePluginAgentTool({
    pluginId,
    tool: tools.listScriptCalls,
    handler: ({ uniqueId, method, errorsOnly, limit, cursor } = {}) => {
      const rows = listScriptCalls({ uniqueId, method, errorsOnly }).map(
        toScriptCallRow
      );
      return {
        ...paginateArray(rows, {
          keyOf: (row) => String(row.seq),
          limit,
          cursor,
          scope: `${uniqueId ?? ''}|${method ?? ''}|${errorsOnly ?? ''}`,
        }),
        total: rows.length,
      };
    },
  });

  useRozenitePluginAgentTool({
    pluginId,
    tool: tools.getScriptManager,
    handler: () => getScriptManagerState(),
  });

  useRozenitePluginAgentTool({
    pluginId,
    tool: tools.injectScriptFault,
    handler: (args) => injectAppFault(args),
  });

  useRozenitePluginAgentTool({
    pluginId,
    tool: tools.injectServerFault,
    handler: (args) => injectServerFault(args),
  });

  useRozenitePluginAgentTool({
    pluginId,
    tool: tools.listFaults,
    handler: ({ origin } = {}) => listFaults(origin),
  });

  useRozenitePluginAgentTool({
    pluginId,
    tool: tools.clearFaults,
    handler: ({ id, origin } = {}) => clearFaults(id, origin),
  });

  useRozenitePluginAgentTool({
    pluginId,
    tool: tools.getFederation,
    handler: () => getFederation(),
  });

  useRozenitePluginAgentTool({
    pluginId,
    tool: tools.listFederationEvents,
    handler: ({ type, errorsOnly, limit, cursor } = {}) => {
      const rows = getStore()
        .federationEvents.filter(
          (event) =>
            (!type || event.type === type) && (!errorsOnly || !!event.error)
        )
        .map(toFederationEventRow);
      return {
        ...paginateArray(rows, {
          keyOf: (row) => String(row.seq),
          limit,
          cursor,
          scope: `${type ?? ''}|${errorsOnly ?? ''}`,
        }),
        total: rows.length,
      };
    },
  });

  useRozenitePluginAgentTool({
    pluginId,
    tool: tools.loadRemote,
    handler: ({ id, instance }) => loadRemote(id, instance),
  });

  useRozenitePluginAgentTool({
    pluginId,
    tool: tools.listErrors,
    handler: ({ source, limit, cursor } = {}) => {
      const rows = listErrors({ source }).map(toErrorRow);
      return {
        ...paginateArray(rows, {
          keyOf: (row) => row.id,
          limit,
          cursor,
          scope: source ?? '',
        }),
        total: rows.length,
      };
    },
  });

  useRozenitePluginAgentTool({
    pluginId,
    tool: tools.getError,
    handler: ({ id }) => {
      const error = getStore().errors.find((item) => item.id === id);
      if (!error) throw new Error(`No recorded error "${id}".`);
      return error;
    },
  });

  useRozenitePluginAgentTool({
    pluginId,
    tool: tools.symbolicate,
    handler: (args) => symbolicate(args ?? {}),
  });

  useRozenitePluginAgentTool({
    pluginId,
    tool: tools.getDevServer,
    handler: async ({ origin, requests = 'failed' } = {}) => {
      const state = await fetchDevServerState(origin);
      return {
        ...state,
        requests:
          requests === 'all'
            ? state.requests
            : requests === 'none'
              ? []
              : state.requests.filter(isFailedRequest),
      };
    },
  });

  useRozenitePluginAgentTool({
    pluginId,
    tool: tools.clear,
    handler: ({ scope } = {}) => clear(scope),
  });

  useRozenitePluginAgentTool({
    pluginId,
    tool: tools.reload,
    handler: () => reload(),
  });
};
