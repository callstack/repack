import type { EnvOptions } from '../../../types.js';
import { loadConfig } from '../loadConfig.js';

describe('loadConfig', () => {
  const mockEnvOptions: EnvOptions = {
    platform: 'ios',
    mode: 'development',
    context: '/test/root',
    entry: 'index.js',
  };

  beforeEach(() => {
    jest.resetModules();
  });

  it('should load and normalize CommonJS config object', async () => {
    const mockConfig = {
      entry: './index.js',
      output: { path: './dist' },
    };

    jest.doMock('/test/config.js', () => mockConfig, { virtual: true });

    const result = await loadConfig('/test/config.js', mockEnvOptions);

    expect(result).toEqual({
      ...mockConfig,
      name: 'ios',
    });
  });

  it('should load and normalize ESM config object', async () => {
    const mockConfig = {
      entry: './index.js',
      output: { path: './dist' },
    };

    jest.doMock(
      '/test/config.mjs',
      () => ({
        default: mockConfig,
      }),
      { virtual: true }
    );

    const result = await loadConfig('/test/config.mjs', mockEnvOptions);

    expect(result).toEqual({
      ...mockConfig,
      name: 'ios',
    });
  });

  it('should handle function configuration', async () => {
    const mockConfigFn = jest.fn().mockImplementation((env: EnvOptions) => ({
      entry: './index.js',
      mode: env.mode,
    }));

    jest.doMock('/test/config.js', () => mockConfigFn, { virtual: true });

    const result = await loadConfig('/test/config.js', mockEnvOptions);

    expect(mockConfigFn).toHaveBeenCalledWith(mockEnvOptions, {});
    expect(result).toEqual({
      entry: './index.js',
      mode: 'development',
      name: 'ios',
    });
  });

  it('should handle async function configuration', async () => {
    const mockConfigFn = jest
      .fn()
      .mockImplementation(async (env: EnvOptions) => ({
        entry: './index.js',
        mode: env.mode,
      }));

    jest.doMock('/test/config.js', () => mockConfigFn, { virtual: true });

    const result = await loadConfig('/test/config.js', mockEnvOptions);

    expect(mockConfigFn).toHaveBeenCalledWith(mockEnvOptions, {});
    expect(result).toEqual({
      entry: './index.js',
      mode: 'development',
      name: 'ios',
    });
  });

  it('should throw when config file cannot be loaded', async () => {
    await expect(
      loadConfig('/non/existent/config.js', mockEnvOptions)
    ).rejects.toThrow();
  });
});
