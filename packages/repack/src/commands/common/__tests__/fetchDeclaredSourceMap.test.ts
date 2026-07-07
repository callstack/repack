import {
  coerceToHttpUrl,
  fetchDeclaredSourceMap,
} from '../fetchDeclaredSourceMap.js';

describe('coerceToHttpUrl', () => {
  const expectCoerced = (input: string, expected: string | undefined) => {
    expect(coerceToHttpUrl(input)?.href).toBe(expected);
  };

  it('accepts http(s) URLs as-is', () => {
    expectCoerced(
      'http://localhost:8081/index.bundle?platform=ios',
      'http://localhost:8081/index.bundle?platform=ios'
    );
    expectCoerced(
      'https://dev.example.com/index.bundle',
      'https://dev.example.com/index.bundle'
    );
  });

  it('coerces scheme-less host:port URLs', () => {
    // `new URL('localhost:9000/x')` parses successfully with `localhost:`
    // as the scheme, so coercion must not rely on the parse throwing.
    expectCoerced(
      'localhost:9000/app.container.js.bundle',
      'http://localhost:9000/app.container.js.bundle'
    );
    expectCoerced(
      '10.0.2.2:8081/index.bundle?platform=android',
      'http://10.0.2.2:8081/index.bundle?platform=android'
    );
    expectCoerced(
      '//localhost:8081/index.bundle',
      'http://localhost:8081/index.bundle'
    );
  });

  it('rejects values that are not fetchable URLs', () => {
    expectCoerced('/data/user/0/com.app/files/index.android.bundle', undefined);
    expectCoerced('webpack-internal:///./src/index.js', undefined);
    expectCoerced('[native code]', undefined);
    expectCoerced('index.bundle', undefined);
    expectCoerced(
      '__federation_expose_MFE1Navigator.mfe1.chunk.bundle',
      undefined
    );
  });
});

describe('fetchDeclaredSourceMap', () => {
  const VALID_MAP = JSON.stringify({
    version: 3,
    sources: ['src/App.tsx'],
    names: [],
    mappings: 'AAAA',
  });

  // Module-level memoization persists across tests, so give each test its
  // own bundle URL.
  let testId = 0;
  const uniqueBundleUrl = () =>
    `http://localhost:8082/ios/bundle-${testId++}.chunk.bundle`;

  const mockFetch = (
    responses: Record<string, { ok: boolean; body: string }>
  ) => {
    const fetchMock = jest.fn(async (input: string | URL | Request) => {
      const url = input.toString();
      const response = responses[url];
      if (!response) {
        throw new Error(`Unexpected fetch: ${url}`);
      }
      return {
        ok: response.ok,
        // TextEncoder produces an unpooled buffer — `Buffer.from(...).buffer`
        // would expose the whole shared Buffer pool, not just the body.
        arrayBuffer: async () => new TextEncoder().encode(response.body).buffer,
      } as Response;
    });
    jest.spyOn(globalThis, 'fetch').mockImplementation(fetchMock);
    return fetchMock;
  };

  it('fetches the map declared by the bundle, resolved relative to it', async () => {
    const bundleUrl = uniqueBundleUrl();
    const mapUrl = `${bundleUrl}.map?platform=ios`;
    mockFetch({
      [bundleUrl]: {
        ok: true,
        body: `console.log(1);\n//# sourceMappingURL=${bundleUrl.split('/').pop()}.map?platform=ios`,
      },
      [mapUrl]: { ok: true, body: VALID_MAP },
    });

    const result = await fetchDeclaredSourceMap(bundleUrl);
    expect(result?.toString()).toBe(VALID_MAP);
  });

  it('returns undefined when the bundle declares no source map', async () => {
    const bundleUrl = uniqueBundleUrl();
    mockFetch({
      [bundleUrl]: { ok: true, body: 'console.log(1);' },
    });

    await expect(fetchDeclaredSourceMap(bundleUrl)).resolves.toBeUndefined();
  });

  it('rejects responses that are not source maps', async () => {
    const bundleUrl = uniqueBundleUrl();
    mockFetch({
      [bundleUrl]: {
        ok: true,
        body: '//# sourceMappingURL=app.map',
      },
      [new URL('app.map', bundleUrl).href]: {
        ok: true,
        body: '<!doctype html><title>catch-all</title>',
      },
    });

    await expect(fetchDeclaredSourceMap(bundleUrl)).resolves.toBeUndefined();
  });

  it('returns undefined for URLs that cannot be fetched', async () => {
    const fetchMock = mockFetch({});
    await expect(
      fetchDeclaredSourceMap('/data/user/0/com.app/files/index.android.bundle')
    ).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('memoizes lookups so repeated symbolication does not refetch', async () => {
    const bundleUrl = uniqueBundleUrl();
    const fetchMock = mockFetch({
      [bundleUrl]: { ok: true, body: 'no comment here' },
    });

    await fetchDeclaredSourceMap(bundleUrl);
    await fetchDeclaredSourceMap(bundleUrl);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
