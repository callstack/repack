import Observable from 'zen-observable';

export type WebSocketMessage =
  | {
      type: 'init' | 'open' | 'close';
    }
  | {
      type: 'message' | 'compilation';
      data: string;
    };

export type DevServerMessage =
  | {
      type: 'init' | 'open' | 'close';
    }
  | {
      type: 'message';
      payload:
        | {
            kind: 'server-log';
            log: LogEntry;
          }
        | {
            kind: 'progress';
            value: number;
            platform: string;
            label: string;
          }
        | {
            kind: 'compilation';
            event:
              | {
                  name: 'invalid' | 'done';
                }
              | {
                  name: 'watchRun';
                  port: number;
                  platform: string;
                };
          };
    };

export interface DevServerContext {
  getPlatforms: () => string[];
  getCompilerConnection: (platform: string) => Observable<DevServerMessage>;
  getProxyConnection: () => Observable<DevServerMessage>;
}

export type LogEntry = {
  issuer: string;
  message: any[];
  timestamp: number;
  type: 'debug' | 'info' | 'warn' | 'error';
};
