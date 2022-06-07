import { FastifyLoggerInstance } from 'fastify';
import type { CompilerDelegate } from './plugins/compiler';
import type { SymbolicatorDelegate } from './plugins/symbolicate';
import type { HmrDelegate } from './plugins/wss';

export namespace Server {
  export interface Config {
    options: Options;
    delegate: (context: DelegateContext) => Delegate;
  }

  export interface Options {
    rootDir: string;
    port: number;
    host?: string;
    https?: {
      cert?: string;
      key?: string;
    };
  }

  export interface Delegate {
    compiler: CompilerDelegate;
    symbolicator: SymbolicatorDelegate;
    logger: LoggerDelegate;
    hmr: HmrDelegate;
    messages: MessagesDelegate;
  }

  export interface DelegateContext {
    log: FastifyLoggerInstance;
    notifyBuildStart: (platform: string) => void;
    notifyBuildEnd: (platform: string) => void;
    broadcastToHmrClients: <E = any>(
      event: E,
      platform: string,
      clientIds?: string[]
    ) => void;
    broadcastToMessageClients: <
      E extends { method: string; params?: Record<string, any> }
    >(
      event: E
    ) => void;
  }

  export interface LoggerDelegate {
    onMessage: (log: any) => void;
  }

  export interface MessagesDelegate {
    getHello: () => string;
    getStatus: () => string;
  }
}

export namespace Internal {
  export enum EventTypes {
    BuildStart = 'BuildStart',
    BuildEnd = 'BuildEnd',
    HmrEvent = 'HmrEvent',
  }
}
