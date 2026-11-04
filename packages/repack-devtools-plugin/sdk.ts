import { defineAgentToolDescriptors } from '@rozenite/agent-shared';
import {
  REPACK_DEVTOOLS_AGENT_PLUGIN_ID,
  repackDevToolsToolDefinitions,
} from './src/shared/agent-tools';

export { REPACK_DEVTOOLS_AGENT_PLUGIN_ID, repackDevToolsToolDefinitions };

/**
 * Typed descriptors for `@rozenite/agent-sdk`:
 *
 * ```ts
 * await session.tools.call(repackDevToolsTools.getOverview, {});
 * ```
 */
export const repackDevToolsTools = defineAgentToolDescriptors(
  REPACK_DEVTOOLS_AGENT_PLUGIN_ID,
  repackDevToolsToolDefinitions
);

export type * from './src/shared/agent-tools';
export type * from './src/shared/types';
