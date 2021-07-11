import { CLI_OPTIONS_ENV_KEY } from '../../../../env';
import { isMinimizeEnabled } from '../isMinimizeEnabled';

describe('isMinimizeEnabled', () => {
  beforeEach(() => {
    delete process.env[CLI_OPTIONS_ENV_KEY];
  });

  it('should return fallback value', () => {
    expect(isMinimizeEnabled()).toBe(false);
    expect(isMinimizeEnabled({ fallback: true })).toBe(true);
  });

  it('should return value from CLI options for bundle command', () => {
    process.env[CLI_OPTIONS_ENV_KEY] = JSON.stringify({
      arguments: {
        bundle: {
          minify: true,
        },
      },
    });

    expect(isMinimizeEnabled()).toBe(true);

    process.env[CLI_OPTIONS_ENV_KEY] = JSON.stringify({
      arguments: {
        bundle: {
          minify: false,
        },
      },
    });

    expect(isMinimizeEnabled()).toBe(false);

    process.env[CLI_OPTIONS_ENV_KEY] = JSON.stringify({
      arguments: {
        bundle: {
          dev: false,
        },
      },
    });

    expect(isMinimizeEnabled()).toBe(true);
  });

  it('should return value from CLI options for start command', () => {
    process.env[CLI_OPTIONS_ENV_KEY] = JSON.stringify({
      arguments: {
        start: {},
      },
    });

    expect(isMinimizeEnabled()).toBe(false);
    expect(isMinimizeEnabled({ fallback: true })).toBe(true);
  });
});
