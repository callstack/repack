import { describe, expect, it } from 'vitest';
import { normalizeOptions } from '../normalizeOptions.js';

const base = {
  devMiddleware: {} as never,
  rootDir: '/project',
};

describe('normalizeOptions url', () => {
  it('uses the default port in the url when port is omitted', () => {
    const { url, port } = normalizeOptions({ ...base });
    expect(port).toBe(8081);
    expect(url).toBe('http://localhost:8081');
    expect(url).not.toContain('undefined');
  });

  it('keeps an explicit port in the url', () => {
    const { url } = normalizeOptions({ ...base, port: 9000 });
    expect(url).toBe('http://localhost:9000');
  });

  it('combines an explicit host with the default port', () => {
    const { url } = normalizeOptions({ ...base, host: '0.0.0.0' });
    expect(url).toBe('http://0.0.0.0:8081');
  });

  it('uses the https scheme with the default port for an https server', () => {
    const { url } = normalizeOptions({
      ...base,
      server: { type: 'https', options: {} },
    });
    expect(url).toBe('https://localhost:8081');
  });
});
