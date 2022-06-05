import type { FastifyInstance, FastifyServerOptions } from 'fastify';
import type { CompilerOptions } from './plugins/compiler';
import type { SymbolicateOptions } from './plugins/symbolicate';
import type { WebSocketServersPlugin } from './plugins/wss';

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

export interface DevServerConfig {
  rootDir: string;
  server: DevServerOptions;
  compiler: CompilerOptions;
  symbolicate: SymbolicateOptions;
  events?: EventsOptions;
  messages?: {
    hello?: string;
    status?: string;
  };
  logger?: FastifyServerOptions['logger'];
}

export interface EventsOptions {
  emitter: EventEmitter;
}

export interface EventEmitter {
  addListener(event: string, listener: (platform: string) => void): this;
  removeListener(event: string, listener: (platform: string) => void): this;
}

export enum DevServerEvents {
  BuildStart = 'BuildStart',
  BuildEnd = 'BuildEnd',
  HmrMessage = 'HmrMessage',
}

export type FastifyDevServer = FastifyInstance & {
  wss: WebSocketServersPlugin;
};
