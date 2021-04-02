const WS_DEBUGGER_URL = '/inspector/debug';

export interface PageDescription {
  id: string;
  description: string;
  title: string;
  faviconUrl: string;
  devtoolsFrontendUrl: string;
  type: string;
  webSocketDebuggerUrl: string;
  vm?: string;
}

export class Page {
  constructor(
    public readonly deviceId: number,
    public readonly id: string,
    public readonly app: string,
    public readonly title: string,
    public readonly vm?: string
  ) {}

  buildDescription(serverHost: string): PageDescription {
    const debuggerUrl = `${serverHost}${WS_DEBUGGER_URL}?device=${this.deviceId}&page=${this.id}`;
    const webSocketDebuggerUrl = 'ws://' + debuggerUrl;
    const devtoolsFrontendUrl =
      'chrome-devtools://devtools/bundled/inspector.html?experiments=true&v8only=true&ws=' +
      encodeURIComponent(debuggerUrl);
    return {
      id: `${this.deviceId}-${this.id}`,
      description: this.app,
      title: this.title,
      faviconUrl: 'https://reactjs.org/favicon.ico',
      devtoolsFrontendUrl,
      type: 'node',
      webSocketDebuggerUrl,
      vm: this.vm,
    };
  }
}
