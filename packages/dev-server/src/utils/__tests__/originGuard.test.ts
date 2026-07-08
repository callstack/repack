import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { isOriginAllowed, registerOriginGuard } from '../originGuard.js';

describe('isOriginAllowed', () => {
  it.each([
    // Same host, any port (dev tools may run on another local port).
    ['http://localhost:8081', 'localhost', true],
    ['http://localhost:3000', 'localhost', true],
    // Loopback aliases are the same machine as localhost.
    ['http://127.0.0.1:8081', 'localhost', true],
    ['http://[::1]:8081', 'localhost', true],
    // Chrome DevTools.
    ['devtools://devtools', 'localhost', true],
    // Server bound to a LAN IP, browsed from that IP.
    ['http://192.168.1.10:8081', '192.168.1.10', true],
    // Cross-origin drive-by attempts.
    ['http://evil.com', 'localhost', false],
    ['https://evil.com', 'localhost', false],
    // Suffix/prefix tricks must not match.
    ['http://localhost.evil.com:8081', 'localhost', false],
    ['http://notlocalhost:8081', 'localhost', false],
    // Opaque / non-http origins.
    ['null', 'localhost', false],
    ['file://', 'localhost', false],
    ['devtools://devtools-evil', 'localhost', false],
  ])('%s (host %s) → %s', (origin, host, expected) => {
    expect(isOriginAllowed(origin, host)).toBe(expected);
  });
});

describe('registerOriginGuard', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  async function makeServer() {
    const instance = Fastify();
    registerOriginGuard(instance, 'localhost');
    instance.post('/open-stack-frame', async () => 'OK');
    await instance.ready();
    return instance;
  }

  it('allows requests with no Origin header (native React Native app)', async () => {
    app = await makeServer();
    const response = await app.inject({
      method: 'POST',
      url: '/open-stack-frame',
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('allows same-origin browser requests', async () => {
    app = await makeServer();
    const response = await app.inject({
      method: 'POST',
      url: '/open-stack-frame',
      headers: { origin: 'http://localhost:8081' },
    });
    expect(response.statusCode).toBe(200);
  });

  it('blocks cross-origin browser requests', async () => {
    app = await makeServer();
    const response = await app.inject({
      method: 'POST',
      url: '/open-stack-frame',
      headers: { origin: 'http://evil.com' },
    });
    expect(response.statusCode).toBe(403);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('allows the Chrome DevTools origin', async () => {
    app = await makeServer();
    const response = await app.inject({
      method: 'POST',
      url: '/open-stack-frame',
      headers: { origin: 'devtools://devtools' },
    });
    expect(response.statusCode).toBe(200);
  });
});
