import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  loadManifest,
  ManifestInvalidError,
  ManifestNotFoundError,
} from '../loadManifest.js';

const FIXTURES = path.join(__dirname, '__fixtures__');

let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repack-manifest-'));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

afterEach(() => {
  jest.restoreAllMocks();
});

function mockFetch(
  handler: (url: string) => { ok: boolean; body: unknown } | undefined
) {
  return jest
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (input: URL | RequestInfo) => {
      const url = String(input);
      const response = handler(url);
      if (!response) throw new Error(`Unexpected fetch: ${url}`);
      return {
        ok: response.ok,
        status: response.ok ? 200 : 404,
        json: async () => response.body,
      } as Response;
    });
}

describe('loadManifest', () => {
  it('loads a manifest from a file path', async () => {
    const file = path.join(FIXTURES, 'host.json');

    const result = await loadManifest(file);

    expect(result.manifest.name).toBe('shell');
    expect(result.source).toBe(file);
    expect(result.resolvedFrom).toBe(file);
  });

  it('resolves the default filename inside a directory', async () => {
    const result = await loadManifest(FIXTURES);

    expect(result.manifest.name).toBe('shell');
    expect(result.resolvedFrom).toBe(
      path.join(FIXTURES, 'repack-federation-manifest.json')
    );
  });

  it('honours an explicit manifestPath inside a directory', async () => {
    const result = await loadManifest(FIXTURES, {
      manifestPath: path.join(FIXTURES, 'remote-clean.json'),
    });

    expect(result.manifest.name).toBe('store');
    expect(result.resolvedFrom).toBe(path.join(FIXTURES, 'remote-clean.json'));
  });

  it('fetches a directory URL using the default filename', async () => {
    const body = JSON.parse(
      fs.readFileSync(path.join(FIXTURES, 'remote-clean.json'), 'utf-8')
    );
    const fetchMock = mockFetch((url) =>
      url === 'https://example.com/store/repack-federation-manifest.json'
        ? { ok: true, body }
        : undefined
    );

    const result = await loadManifest('https://example.com/store');

    expect(result.manifest.name).toBe('store');
    expect(result.resolvedFrom).toBe(
      'https://example.com/store/repack-federation-manifest.json'
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses a URL ending in .json as-is', async () => {
    const body = JSON.parse(
      fs.readFileSync(path.join(FIXTURES, 'host.json'), 'utf-8')
    );
    const fetchMock = mockFetch((url) =>
      url === 'https://example.com/custom-name.json'
        ? { ok: true, body }
        : undefined
    );

    const result = await loadManifest('https://example.com/custom-name.json');

    expect(result.resolvedFrom).toBe('https://example.com/custom-name.json');
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://example.com/custom-name.json')
    );
  });

  it('prefers an explicit manifestPath URL over the source', async () => {
    const body = JSON.parse(
      fs.readFileSync(path.join(FIXTURES, 'remote-clean.json'), 'utf-8')
    );
    mockFetch((url) =>
      url === 'https://cdn.example.com/explicit.json'
        ? { ok: true, body }
        : undefined
    );

    const result = await loadManifest('https://example.com/store', {
      manifestPath: 'https://cdn.example.com/explicit.json',
    });

    expect(result.resolvedFrom).toBe('https://cdn.example.com/explicit.json');
  });

  it('reports a failed fetch as a missing manifest', async () => {
    mockFetch(() => ({ ok: false, body: null }));

    await expect(
      loadManifest('https://example.com/store')
    ).rejects.toBeInstanceOf(ManifestNotFoundError);
  });

  it('reports a network failure as an invalid manifest', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(
      loadManifest('https://example.com/store')
    ).rejects.toBeInstanceOf(ManifestInvalidError);
  });

  it('reports a missing file as not found', async () => {
    await expect(
      loadManifest(path.join(tmpDir, 'nope.json'))
    ).rejects.toBeInstanceOf(ManifestNotFoundError);
  });

  it('reports a missing manifest inside a directory as not found', async () => {
    const emptyDir = fs.mkdtempSync(path.join(tmpDir, 'empty-'));

    await expect(loadManifest(emptyDir)).rejects.toBeInstanceOf(
      ManifestNotFoundError
    );
  });

  it('reports malformed JSON as invalid', async () => {
    const file = path.join(tmpDir, 'broken.json');
    fs.writeFileSync(file, '{"manifestVersion": 1, ');

    await expect(loadManifest(file)).rejects.toBeInstanceOf(
      ManifestInvalidError
    );
  });

  it('reports a document without manifestVersion as invalid', async () => {
    const file = path.join(tmpDir, 'no-version.json');
    fs.writeFileSync(file, JSON.stringify({ name: 'shell' }));

    await expect(loadManifest(file)).rejects.toBeInstanceOf(
      ManifestInvalidError
    );
  });

  it('reports a document without name or id as invalid', async () => {
    const file = path.join(tmpDir, 'no-identity.json');
    fs.writeFileSync(file, JSON.stringify({ manifestVersion: 1 }));

    await expect(loadManifest(file)).rejects.toBeInstanceOf(
      ManifestInvalidError
    );
  });

  it('reports a non-object document as invalid', async () => {
    const file = path.join(tmpDir, 'array.json');
    fs.writeFileSync(file, JSON.stringify([{ manifestVersion: 1 }]));

    await expect(loadManifest(file)).rejects.toBeInstanceOf(
      ManifestInvalidError
    );
  });

  it('reports a numeric manifestVersion and a string id as valid', async () => {
    const file = path.join(tmpDir, 'id-only.json');
    fs.writeFileSync(file, JSON.stringify({ manifestVersion: 1, id: 'only' }));

    await expect(loadManifest(file)).resolves.toMatchObject({
      manifest: { id: 'only' },
    });
  });
});
