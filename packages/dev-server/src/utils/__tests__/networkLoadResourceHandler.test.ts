import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleCustomNetworkLoadResource } from '../networkLoadResourceHandler.js';

function createConnectionSpy(): {
  connection: Parameters<typeof handleCustomNetworkLoadResource>[0];
  sendMessage: ReturnType<typeof vi.fn>;
} {
  const sendMessage = vi.fn();

  return {
    connection: {
      debugger: {
        sendMessage,
      },
    },
    sendMessage,
  };
}

describe('handleCustomNetworkLoadResource', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not intercept messages other than Network.loadNetworkResource', () => {
    const { connection, sendMessage } = createConnectionSpy();

    const result = handleCustomNetworkLoadResource(
      connection,
      {
        id: 1,
        method: 'Runtime.enable',
      },
      'http://127.0.0.1:8081'
    );

    expect(result).toBe(false);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('should not intercept malformed Network.loadNetworkResource messages', () => {
    const { connection, sendMessage } = createConnectionSpy();

    const result = handleCustomNetworkLoadResource(
      connection,
      {
        id: 1,
        method: 'Network.loadNetworkResource',
        params: {},
      },
      'http://127.0.0.1:8081'
    );

    expect(result).toBe(false);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('should not intercept same-origin Network.loadNetworkResource requests', () => {
    const { connection, sendMessage } = createConnectionSpy();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const result = handleCustomNetworkLoadResource(
      connection,
      {
        id: 1,
        method: 'Network.loadNetworkResource',
        params: {
          url: 'http://127.0.0.1:8081/main.bundle.map',
        },
      },
      'http://127.0.0.1:8081'
    );

    expect(result).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('should intercept cross-origin Network.loadNetworkResource requests', async () => {
    const { connection, sendMessage } = createConnectionSpy();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      status: 200,
      headers: new Headers([['content-type', 'application/json']]),
      text: () => Promise.resolve('{"ok":true}'),
    } as unknown as Response);

    const handled = handleCustomNetworkLoadResource(
      connection,
      {
        id: 7,
        method: 'Network.loadNetworkResource',
        params: {
          url: 'http://10.10.10.10:9000/remote.bundle.map',
        },
      },
      'http://127.0.0.1:8081'
    );

    expect(handled).toBe(true);

    await vi.waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith({
        id: 7,
        result: {
          resource: {
            success: true,
            httpStatusCode: 200,
            headers: {
              'content-type': 'application/json',
            },
            content: Buffer.from('{"ok":true}').toString('base64'),
            base64Encoded: true,
          },
        },
      });
    });
  });

  it('should return a CDP failure response when resource fetch fails', async () => {
    const { connection, sendMessage } = createConnectionSpy();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new Error('network failed')
    );

    const handled = handleCustomNetworkLoadResource(
      connection,
      {
        id: 9,
        method: 'Network.loadNetworkResource',
        params: {
          url: 'http://10.10.10.10:9000/remote.bundle.map',
        },
      },
      'http://127.0.0.1:8081'
    );

    expect(handled).toBe(true);

    await vi.waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith({
        id: 9,
        result: {
          resource: {
            success: false,
            netErrorName: 'net::ERR_FAILED',
            netError: -2,
            httpStatusCode: 500,
          },
        },
      });
    });
  });
});
