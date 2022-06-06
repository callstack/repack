import { FastifyLoggerInstance } from 'fastify';
import type { CompilerDelegate } from './plugins/compiler';
import type { SymbolicatorDelegate } from './plugins/symbolicate';
import type { HmrDelegate } from './plugins/wss';

/**
 * Development server configuration options.
 */
export interface DevServerOptions {
  /**
   * Hostname or IP address under which to run the development server.
   * When left unspecified, it will listen on all available network interfaces, similarly to listening on '0.0.0.0'.
   */
  host?: string;

  /** Port under which to run the development server. See: {@link DEFAULT_PORT}. */
  port: number;

  /** HTTPS options.
   * If specified, the server will use HTTPS, otherwise HTTP.
   */
  https?: {
    /** Path to certificate when running server on HTTPS. */
    cert?: string;

    /** Path to certificate key when running server on HTTPS. */
    key?: string;
  };

  /** Whether to enable Hot Module Replacement. */
  hmr?: boolean;
}

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
    isVerbose?: boolean;
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
