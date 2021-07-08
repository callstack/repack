import { CLI_OPTIONS_ENV_KEY } from '../../../../env';
import { DEFAULT_PORT, getDevServerOptions } from '../getDevServerOptions';

describe('getDevServerOptions', () => {
  beforeEach(() => {
    delete process.env[CLI_OPTIONS_ENV_KEY];
  });

  it('should return fallback value', () => {
    expect(getDevServerOptions()).toEqual({
      port: DEFAULT_PORT,
    });
  });

  it('should return value from CLI options for bundle command', () => {
    process.env[CLI_OPTIONS_ENV_KEY] = JSON.stringify({
      arguments: {
        bundle: {},
      },
    });

    expect(getDevServerOptions()).toEqual({
      enabled: false,
      port: DEFAULT_PORT,
    });
  });

  it('should return value from CLI options for start command', () => {
    process.env[CLI_OPTIONS_ENV_KEY] = JSON.stringify({
      arguments: {
        start: {},
      },
    });

    expect(getDevServerOptions()).toEqual({
      enabled: true,
      hmr: true,
      port: DEFAULT_PORT,
      host: 'localhost',
    });

    process.env[CLI_OPTIONS_ENV_KEY] = JSON.stringify({
      arguments: {
        start: {
          port: 9999,
          host: '0.0.0.0',
        },
      },
    });

    expect(getDevServerOptions({ fallback: { hmr: false } })).toEqual({
      enabled: true,
      hmr: false,
      port: 9999,
      host: '0.0.0.0',
      cert: undefined,
      https: undefined,
      key: undefined,
    });

    process.env[CLI_OPTIONS_ENV_KEY] = JSON.stringify({
      arguments: {
        start: {},
      },
    });

    expect(
      getDevServerOptions({ fallback: { hmr: false, host: '1.2.3.4' } })
    ).toEqual({
      enabled: true,
      hmr: false,
      port: 8081,
      host: '1.2.3.4',
      cert: undefined,
      https: undefined,
      key: undefined,
    });
  });
});
