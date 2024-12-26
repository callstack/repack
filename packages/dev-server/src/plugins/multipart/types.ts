import type { IncomingHttpHeaders } from 'node:http';

export interface MultipartHandler {
  writeChunk: <T>(
    headers: IncomingHttpHeaders,
    data: T,
    isLast?: boolean
  ) => void;
  setHeader: (name: string, value: string | string[] | undefined) => void;
  end: <T>(data: T) => void;
}

declare module 'fastify' {
  interface FastifyReply {
    asMultipart: () => MultipartHandler | undefined;
  }
}

declare module 'ws' {
  interface WebSocket {
    isAlive?: boolean;
  }
}
