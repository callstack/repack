import { CLI_OPTIONS_ENV_KEY } from '../../../../env';
import { getMode } from '../getMode';

describe('getMode', () => {
  beforeEach(() => {
    delete process.env[CLI_OPTIONS_ENV_KEY];
  });

  it('should return fallback value', () => {
    expect(getMode()).toEqual('production');
    expect(getMode({ fallback: 'development' })).toEqual('development');
  });

  it('should return value from CLI options for bundle command', () => {
    process.env[CLI_OPTIONS_ENV_KEY] = JSON.stringify({
      arguments: {
        bundle: {
          dev: false,
        },
      },
    });

    expect(getMode()).toEqual('production');

    process.env[CLI_OPTIONS_ENV_KEY] = JSON.stringify({
      arguments: {
        bundle: {
          dev: true,
        },
      },
    });

    expect(getMode()).toEqual('development');
  });

  it('should return value from CLI options for start command', () => {
    process.env[CLI_OPTIONS_ENV_KEY] = JSON.stringify({
      arguments: {
        start: {},
      },
    });

    expect(getMode()).toEqual('development');
  });
});
