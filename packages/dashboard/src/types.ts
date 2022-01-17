import Observable from 'zen-observable';

export type WebSocketMessage =
  | {
      type: 'open';
    }
  | { type: 'init' | 'close'; retriesLeft: number }
  | {
      type: 'message' | 'compilation';
      data: string;
    };

export type DevServerMessage =
  | {
      type: 'open';
    }
  | { type: 'init' | 'close'; retriesLeft: number }
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
            message: string;
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

export type ProxyMessage = {
  kind: 'server-log';
  log: LogEntry;
};

export interface DevServerContext {
  tryReconnecting: () => void;
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

export interface Stats {
  time: number;
  builtAt: number;
  chunks: Array<{
    rendered: boolean;
    initial: boolean;
    entry: boolean;
    recorded: boolean;
    size: number;
    sizes: Record<string, number>;
    names: string[];
    idHints: string[];
    runtime: string[];
    files: string[];
    auxiliaryFiles: string[];
    hash: string;
  }>;
  assets: Array<{
    type: string;
    name: string;
    info: {
      size: number;
      related: Record<string, string>;
    };
    size: number;
    emitted: boolean;
    comparedForEmit: boolean;
    cached: boolean;
    chunkNames: (string | number)[];
    chunkIdHints: (string | number)[];
    auxiliaryChunkNames?: (string | number)[];
    auxiliaryChunks?: (string | number)[];
    auxiliaryChunkIdHints?: (string | number)[];
    filteredRelated?: number;
    isOverSizeLimit?: boolean;
  }>;
  errors: Array<{
    message: string;
    moduleIdentifier: string;
    moduleName: string;
    loc: string;
  }>;
  warnings: Array<{
    message: string;
    moduleIdentifier: string;
    moduleName: string;
    loc: string;
  }>;
}
