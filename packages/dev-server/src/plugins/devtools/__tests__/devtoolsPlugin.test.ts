import Fastify, { type FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import open from 'open';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from '../../../types.js';
import devtoolsPlugin from '../devtoolsPlugin.js';

vi.mock('open', () => ({
  default: vi.fn(),
}));

const openMock = vi.mocked(open);

async function createTestServer() {
  const instance = Fastify();

  await instance.register(
    fastifyPlugin(
      async (fastify) => {
        fastify.decorate('wss', {
          messageServer: {
            broadcast: vi.fn(),
          },
        } as unknown as FastifyInstance['wss']);
      },
      { name: 'wss-plugin' }
    )
  );
  await instance.register(devtoolsPlugin, {
    delegate: {} as Server.Delegate,
  });

  return instance;
}

describe('devtoolsPlugin /open-url', () => {
  let instance: FastifyInstance;

  beforeEach(async () => {
    openMock.mockResolvedValue({} as never);
    instance = await createTestServer();
  });

  afterEach(async () => {
    await instance.close();
    vi.clearAllMocks();
  });

  it.each([
    'https://reactnative.dev/docs/tutorial',
    'http://localhost:8081/docs?platform=ios#debugging',
    'https://[::1]:8081/path',
    'https://example.com/a%20path?value=%24safe#fragment',
  ])('should open the validated browser URL %s', async (url) => {
    const response = await instance.inject({
      method: 'POST',
      url: '/open-url',
      payload: { url },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('OK');
    expect(openMock).toHaveBeenCalledOnce();
    expect(openMock).toHaveBeenCalledWith(new URL(url).href);
  });

  it('should accept a text/plain JSON request body', async () => {
    const url = 'https://reactnative.dev/docs/debugging';
    const response = await instance.inject({
      method: 'POST',
      url: '/open-url',
      headers: {
        'content-type': 'text/plain',
      },
      payload: JSON.stringify({ url }),
    });

    expect(response.statusCode).toBe(200);
    expect(openMock).toHaveBeenCalledWith(url);
  });

  it.each([
    ['bare executable', 'calc.exe'],
    ['Windows executable path', 'C:\\Windows\\System32\\calc.exe'],
    ['POSIX application path', '/Applications/Calculator.app'],
    ['UNC path', '\\\\server\\share\\payload.exe'],
    ['file URL', 'file:///etc/passwd'],
    ['JavaScript URL', 'javascript:alert(1)'],
    ['data URL', 'data:text/html,<script>alert(1)</script>'],
    ['custom URL scheme', 'ms-msdt:/id'],
    ['PowerShell subexpression', 'https://example.invalid/$(calc.exe)'],
    ['PowerShell environment expansion', 'https://example.invalid/$env:PATH'],
    ['PowerShell escape character', 'https://example.invalid/?value=`whoami'],
  ])('should reject a %s', async (_name, url) => {
    const response = await instance.inject({
      method: 'POST',
      url: '/open-url',
      payload: { url },
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toBe('Invalid URL');
    expect(openMock).not.toHaveBeenCalled();
  });

  it.each([
    ['missing URL', {}],
    ['non-string URL', { url: 123 }],
    ['array body', [{ url: 'https://example.com' }]],
  ])('should reject a request with a %s', async (_name, payload) => {
    const response = await instance.inject({
      method: 'POST',
      url: '/open-url',
      payload,
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toBe('Invalid URL');
    expect(openMock).not.toHaveBeenCalled();
  });

  it('should reject a request with no body', async () => {
    const response = await instance.inject({
      method: 'POST',
      url: '/open-url',
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toBe('Invalid URL');
    expect(openMock).not.toHaveBeenCalled();
  });

  it('should reject malformed text/plain JSON', async () => {
    const response = await instance.inject({
      method: 'POST',
      url: '/open-url',
      headers: {
        'content-type': 'text/plain',
      },
      payload: 'not JSON',
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toBe('Invalid URL');
    expect(openMock).not.toHaveBeenCalled();
  });
});
