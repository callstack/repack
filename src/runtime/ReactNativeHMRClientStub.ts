/* eslint-env browser */
/// <reference lib="DOM" />
declare var __DEV__: boolean;

import prettyFormat from 'pretty-format';

/**
 * With Webpack we don't use built-in metro-specific HMR client,
 * so the module `react-native/Libraries/Utilities/HMRClient.js` should be replaced with this one.
 *
 * Most of the code is noop apart from the `log` function which handles sending logs from client
 * application to the dev server.
 *
 * The console gets "polyfilled" here:
 * https://github.com/facebook/react-native/blob/v0.63.4/Libraries/Core/setUpDeveloperTools.js#L51-L69
 */

class ClientLogger {
  socket?: WebSocket;
  buffer: Array<{ level: string; data: any[] }> = [];

  constructor() {
    const initSocket = () => {
      const address = `ws://${process.env.__PUBLIC_PATH_HOST__}/__client`;
      this.socket = new WebSocket(address);

      const onClose = () => {
        setTimeout(initSocket, 1000);
      };

      this.socket.onclose = onClose;
      this.socket.onerror = onClose;
      this.socket.onopen = () => this.flushBuffer();
    };

    if (__DEV__ && process.env.__PUBLIC_PATH_HOST__) {
      initSocket();
    }
  }

  send(level: string, data: any[]) {
    try {
      this.socket?.send(
        JSON.stringify({
          type: 'client-log',
          level,
          data: data.map((item: any) =>
            typeof item === 'string'
              ? item
              : prettyFormat(item, {
                  escapeString: true,
                  highlight: true,
                  maxDepth: 3,
                  min: true,
                  plugins: [prettyFormat.plugins.ReactElement],
                })
          ),
        })
      );
    } catch {
      // Ignore error
    }
  }

  flushBuffer() {
    for (const { level, data } of this.buffer) {
      this.send(level, data);
    }

    this.buffer = [];
  }

  log(level: string, data: any[]) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.flushBuffer();
      this.send(level, data);
    } else {
      this.buffer.push({ level, data });
    }
  }
}

const clientLogger = new ClientLogger();

module.exports = {
  setup() {},
  enable() {},
  disable() {},
  registerBundle() {},
  log(level: string, data: any[]) {
    clientLogger.log(level, data);
  },
};
