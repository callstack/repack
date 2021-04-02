import WebSocket from 'ws';
import { Page } from './Page';

export class Device {
  constructor(
    public readonly deviceId: number,
    public readonly deviceName: string,
    public readonly appName: string,
    public readonly context: string,
    private socket: WebSocket
  ) {}

  getPages(): Page[] {
    return [];
  }
}
