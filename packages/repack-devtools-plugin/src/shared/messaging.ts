import type { ActionResult, ScriptActionResult } from './agent-tools';
import type {
  AppInfo,
  FederationEvent,
  FederationState,
  Overview,
  RecordedError,
  ScriptEvent,
  ScriptRecord,
  SymbolicationResult,
} from './types';

export type PanelSnapshot = {
  app: AppInfo;
  scripts: ScriptRecord[];
  scriptEvents: ScriptEvent[];
  federation: FederationState;
  federationEvents: FederationEvent[];
  errors: RecordedError[];
};

/** Fire-and-forget events from the app to the panels. */
export type RepackDevToolsEventMap = {
  'state-changed': { at: number };
};

/** RPC methods the app handles for the panels. */
export type RepackDevToolsMethods = {
  getSnapshot: () => Promise<PanelSnapshot>;
  getOverview: () => Promise<Overview>;
  loadScript: (params: {
    scriptId: string;
    caller?: string;
  }) => Promise<ScriptActionResult>;
  prefetchScript: (params: {
    scriptId: string;
    caller?: string;
  }) => Promise<ScriptActionResult>;
  invalidateScripts: (params: {
    scriptIds?: string[];
  }) => Promise<ActionResult>;
  loadRemote: (params: { id: string }) => Promise<ActionResult>;
  symbolicate: (params: {
    stack?: string;
    errorId?: string;
  }) => Promise<SymbolicationResult>;
  clear: (params: {
    scope?: 'all' | 'scripts' | 'federation' | 'errors';
  }) => Promise<{ cleared: string }>;
  reload: () => Promise<{ reloading: boolean }>;
};
