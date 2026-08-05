import {
  fetchSourceMapFromBundle,
  toHttpUrl,
} from '../fetchSourceMapFromBundle.js';

const VALID_SOURCE_MAP = JSON.stringify({
  version: 3,
  sources: ['[projectRoot]/src/App.tsx'],
  names: [],
  mappings: 'AAAA',
});

function mockFetch(responses: Record<string, { body: string; ok?: boolean }>) {
  return jest.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = input.toString();
    const response = responses[url];
    if (!response) {
      throw new Error(`Unexpected fetch: ${url}`);
    }
    return {
      ok: response.ok ?? true,
      arrayBuffer: async () => new TextEncoder().encode(response.body).buffer,
    } as Response;
  });
}

describe('toHttpUrl', () => {
  it.each([
    [
      'http://localhost:8082/ios/remote.chunk.bundle',
      'http://localhost:8082/ios/remote.chunk.bundle',
    ],
    [
      'localhost:8082/ios/remote.chunk.bundle',
      'http://localhost:8082/ios/remote.chunk.bundle',
    ],
    [
      '10.0.2.2:8082/android/remote.chunk.bundle',
      'http://10.0.2.2:8082/android/remote.chunk.bundle',
    ],
  ])('normalizes %s', (input, expected) => {
    expect(toHttpUrl(input)?.href).toBe(expected);
  });

  it.each([
    'remote.chunk.bundle',
    '/data/user/0/com.example/files/index.android.bundle',
    '[native code]',
  ])('rejects non-fetchable value %s', (input) => {
    expect(toHttpUrl(input)).toBeUndefined();
  });
});

describe('fetchSourceMapFromBundle', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches and validates the source map declared by a foreign bundle', async () => {
    const bundleUrl =
      'http://localhost:8082/ios/foreign-1.chunk.bundle?platform=ios';
    const mapUrl =
      'http://localhost:8082/ios/foreign-1.chunk.bundle.map?platform=ios';
    const fetchMock = mockFetch({
      [bundleUrl]: {
        body: 'code();\n//# sourceMappingURL=foreign-1.chunk.bundle.map?platform=ios',
      },
      [mapUrl]: { body: VALID_SOURCE_MAP },
    });

    await expect(fetchSourceMapFromBundle(bundleUrl)).resolves.toEqual(
      Buffer.from(VALID_SOURCE_MAP)
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects a response that is not a source map', async () => {
    const bundleUrl = 'http://localhost:8082/ios/foreign-2.chunk.bundle';
    mockFetch({
      [bundleUrl]: {
        body: 'code();\n//# sourceMappingURL=foreign-2.chunk.bundle.map',
      },
      [`${bundleUrl}.map`]: { body: '<html>not a source map</html>' },
    });

    await expect(fetchSourceMapFromBundle(bundleUrl)).resolves.toBeUndefined();
  });

  it('caches repeated lookups, including misses', async () => {
    const bundleUrl = 'http://localhost:8082/ios/foreign-3.chunk.bundle';
    const fetchMock = mockFetch({
      [bundleUrl]: { body: 'code without a source map comment' },
    });

    await fetchSourceMapFromBundle(bundleUrl);
    await fetchSourceMapFromBundle(bundleUrl);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
