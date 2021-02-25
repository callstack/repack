import { IncomingMessage } from 'http';
import WebSocket from 'ws';
import { WebSocketRouteHandler } from './WebSocketServer';

export class WebSocketDebuggerHandler implements WebSocketRouteHandler {
  private debuggerSocket: WebSocket | undefined;
  private clientSocket: WebSocket | undefined;

  send(socket: WebSocket | undefined, message: string) {
    try {
      socket?.send(message);
    } catch (error) {
      console.warn('Failed to send data to socket', error);
    }
  }

  /**
   * Called every time new WebSocket connection is established. Each specifies
   * `role` param, which we use to determine type of connection.
   */
  onConnection(socket: WebSocket, request: IncomingMessage) {
    const { url = '' } = request;
    if (url.indexOf('role=debugger') >= 0) {
      console.log('Chrome Remote debugger connected');
      this.onDebuggerConnection(socket);
    } else if (url.indexOf('role=client') >= 0) {
      console.log('React Native debugger client connected');
      this.onClientConnection(socket);
    } else {
      socket.close(1011, 'Missing role param');
    }
  }

  /**
   * New debugger connection handler.
   *
   * Note: When debugger is already connected, new connection gets
   * closed automatically.
   */
  onDebuggerConnection(socket: WebSocket) {
    if (this.debuggerSocket) {
      socket.close(1011, 'Another debugger is already connected');
      return;
    }

    this.debuggerSocket = socket;

    const onClose = () => {
      console.log('Chrome Remote debugger disconnected');
      this.debuggerSocket = undefined;
      if (this.clientSocket) {
        this.clientSocket.removeAllListeners();
        this.clientSocket.close(1011, 'Debugger was disconnected');
      }
    };

    this.debuggerSocket.addEventListener('error', onClose);
    this.debuggerSocket.addEventListener('close', onClose);
    this.debuggerSocket.addEventListener('message', ({ data }) => {
      this.send(this.clientSocket, data.toString());
    });
  }

  /**
   * New client connection handler.
   *
   * Note: New client automatically closes previous client connection
   */
  onClientConnection(socket: WebSocket) {
    if (this.clientSocket) {
      this.clientSocket.removeAllListeners();
      this.clientSocket.close(1011, 'Another client is connected');
      this.clientSocket = undefined;
    }

    const onClose = () => {
      console.log('React Native debugger client disconnected');
      this.clientSocket = undefined;
      this.send(
        this.debuggerSocket,
        JSON.stringify({ method: '$disconnected' })
      );
    };

    this.clientSocket = socket;
    this.clientSocket.addEventListener('error', onClose);
    this.clientSocket.addEventListener('close', onClose);
    this.clientSocket.addEventListener('message', ({ data }) => {
      this.send(this.debuggerSocket, data.toString());
    });
  }
}
