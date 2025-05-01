import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EnvOptions } from '../../../../types.js';
import { loadProjectConfig } from '../loadProjectConfig.js';

describe('loadProjectConfig', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  // vitest doesnt support importing via require
  it.fails('should load static CJS config object', async () => {
    const mockConfig = {
      entry: './index.js',
      output: { path: './dist' },
    };

    vi.doMock('/test/config.js', () => mockConfig);

    const result = await loadProjectConfig('/test/config.js');
    expect(result).toEqual(mockConfig);
  });

  it('should load static ESM config object', async () => {
    const mockConfig = {
      entry: './index.js',
      output: { path: './dist' },
    };

    vi.doMock('/test/config.mjs', () => ({ default: mockConfig }));

    const result = await loadProjectConfig('/test/config.mjs');
    expect(result).toEqual(mockConfig);
  });

  it('should load dynamic (function) config ', async () => {
    const mockConfigFn = vi.fn().mockImplementation((env: EnvOptions) => ({
      entry: './index.js',
      mode: env.mode,
    }));

    vi.doMock('/test/config.mjs', () => ({ default: mockConfigFn }));

    const result = await loadProjectConfig('/test/config.mjs');
    expect(result).toEqual(mockConfigFn);
  });

  it('should throw when config file cannot be loaded', async () => {
    await expect(
      loadProjectConfig('/non/existent/config.js')
    ).rejects.toThrow();
  });
});
