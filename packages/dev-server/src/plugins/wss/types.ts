import type { WebSocketDebuggerServer } from './servers/WebSocketDebuggerServer';
import type { WebSocketDevClientServer } from './servers/WebSocketDevClientServer';
import type { WebSocketMessageServer } from './servers/WebSocketMessageServer';
import type { WebSocketEventsServer } from './servers/WebSocketEventsServer';
import type { HermesInspectorProxy } from './servers/HermesInspectorProxy';
import type { WebSocketDashboardServer } from './servers/WebSocketDashboardServer';
import type { WebSocketRouter } from './WebSocketRouter';

export interface WebSocketServersPlugin {
  debuggerServer: WebSocketDebuggerServer;
  devClientServer: WebSocketDevClientServer;
  messageServer: WebSocketMessageServer;
  eventsServer: WebSocketEventsServer;
  hermesInspectorProxy: HermesInspectorProxy;
  dashboardServer: WebSocketDashboardServer;
  router: WebSocketRouter;
}
