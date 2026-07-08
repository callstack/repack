import type { FastifyInstance } from 'fastify';

// 127.0.0.1 and [::1] are the same machine as `localhost`; a request whose
// Origin is any of these came from a page already served locally, which is
// inside the dev server's trust boundary.
const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Whether a browser `Origin` is permitted to talk to the dev server.
 *
 * The React Native app (LogBox, bundle requests) uses native networking and
 * sends no `Origin` header, so only browser-issued requests carry one. A
 * malicious website the developer happens to have open can issue cross-origin
 * requests to `localhost`, which is how a drive-by page could reach dev-only
 * endpoints that open arbitrary files or URLs on the developer's machine
 * (`/open-stack-frame`, `/open-url`). Blocking mismatched origins closes that
 * vector while leaving native clients unaffected.
 *
 * Mirrors `securityHeadersMiddleware` in `@react-native-community/cli-server-api`.
 */
export function isOriginAllowed(origin: string, host: string): boolean {
  // Chrome DevTools connects from this opaque origin.
  if (origin === 'devtools://devtools') {
    return true;
  }

  let hostname: string;
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }
    hostname = url.hostname;
  } catch {
    return false;
  }

  return hostname === host || LOOPBACK_HOSTNAMES.has(hostname);
}

/**
 * Registers a global hook that rejects cross-origin browser requests and
 * disables MIME sniffing, matching the React Native community CLI dev server.
 * Applied to every route so the file/URL-opening endpoints cannot be driven
 * cross-origin.
 */
export function registerOriginGuard(instance: FastifyInstance, host: string) {
  instance.addHook('onRequest', async (request, reply) => {
    const { origin } = request.headers;
    if (typeof origin === 'string' && !isOriginAllowed(origin, host)) {
      reply.header('X-Content-Type-Options', 'nosniff');
      reply
        .code(403)
        .send(
          `Cross-origin request from ${origin} was blocked by the React Native dev server.`
        );
      return reply;
    }
    reply.header('X-Content-Type-Options', 'nosniff');
  });
}
