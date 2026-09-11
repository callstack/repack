import {
  fetchSourceMapFromBundle,
  getRemoteSource,
  openRemoteStackFrame,
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

    const sourceMap = await fetchSourceMapFromBundle(bundleUrl);

    expect(JSON.parse(sourceMap!.toString())).toMatchObject({
      sources: [
        'http://localhost:8082/__repack_source__/[projectRoot]/src/App.tsx',
      ],
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('preserves the remote owner for project sources in indexed maps', async () => {
    const bundleUrl = 'http://localhost:8083/android/remote.chunk.bundle';
    const sourceMap = JSON.stringify({
      version: 3,
      sections: [
        {
          offset: { line: 0, column: 0 },
          map: {
            version: 3,
            sources: ['[projectRoot^1]/shared/App.tsx'],
            names: [],
            mappings: 'AAAA',
          },
        },
      ],
    });
    mockFetch({
      [bundleUrl]: {
        body: 'code();\n//# sourceMappingURL=remote.chunk.bundle.map',
      },
      [`${bundleUrl}.map`]: { body: sourceMap },
    });

    const result = await fetchSourceMapFromBundle(bundleUrl);

    const [source] = JSON.parse(result!.toString()).sections[0].map.sources;
    const sourceUrl = new URL(source);

    expect(sourceUrl.origin).toBe('http://localhost:8083');
    expect(decodeURIComponent(sourceUrl.pathname)).toBe(
      '/__repack_source__/[projectRoot^1]/shared/App.tsx'
    );
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

describe('remote source frames', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('extracts the owning dev server and project-relative file', () => {
    expect(
      getRemoteSource(
        'http://localhost:8082/__repack_source__/[projectRoot]/src/App.tsx'
      )
    ).toEqual({
      file: '[projectRoot]/src/App.tsx',
      origin: 'http://localhost:8082',
    });
  });

  it('forwards editor navigation to the owning dev server', async () => {
    const fetchMock = mockFetch({
      'http://localhost:8082/open-stack-frame': { body: 'OK' },
    });

    await expect(
      openRemoteStackFrame(
        'http://localhost:8082/__repack_source__/[projectRoot]/src/App.tsx',
        13
      )
    ).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:8082/open-stack-frame'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          file: '[projectRoot]/src/App.tsx',
          lineNumber: 13,
        }),
      })
    );
  });

  it('leaves local source frames to the current dev server', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch');

    await expect(
      openRemoteStackFrame('[projectRoot]/src/App.tsx', 13)
    ).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
