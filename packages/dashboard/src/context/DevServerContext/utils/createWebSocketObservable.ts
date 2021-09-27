/* global ZenObservable */
import Observable from 'zen-observable';
import { DevServerMessage, WebSocketMessage } from '../types';

export function createWebSocketObservable(address: string) {
  let socket: WebSocket | undefined;
  let observers: Array<ZenObservable.SubscriptionObserver<WebSocketMessage>> =
    [];

  const initConnection = () => {
    for (const observer of observers) {
      observer.next({ type: 'init' });
    }
    socket = new WebSocket(address);

    socket.addEventListener('open', () => {
      for (const observer of observers) {
        observer.next({ type: 'open' });
      }
    });

    socket.addEventListener('close', () => {
      for (const observer of observers) {
        observer.next({ type: 'close' });
      }

      socket = undefined;
      setTimeout(() => initConnection(), 5000);
    });

    socket.addEventListener('error', (error) => {
      console.error(error);
    });

    socket.addEventListener('message', (message) => {
      for (const observer of observers) {
        observer.next({
          type: 'message',
          data: message.data.toString(),
        });
      }
    });
  };

  initConnection();

  return new Observable<WebSocketMessage>((observer) => {
    observers.push(observer);

    return () => {
      observers = observers.filter((item) => item !== observer);
    };
  }).map<DevServerMessage>((value) => {
    if (value.type === 'message') {
      return {
        type: value.type,
        payload: JSON.parse(value.data),
      };
    }

    return value as DevServerMessage;
  });
}
