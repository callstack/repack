import { CLI_OPTIONS_ENV_KEY } from '../../../../env';
import { getPlatform } from '../getPlatform';

describe('getPlatform', () => {
  beforeEach(() => {
    delete process.env[CLI_OPTIONS_ENV_KEY];
  });

  it('should return fallback value', () => {
    expect(getPlatform({ fallback: 'ios' })).toEqual('ios');
  });

  it('should return value from CLI options for bundle command', () => {
    process.env[CLI_OPTIONS_ENV_KEY] = JSON.stringify({
      arguments: {
        bundle: {
          platform: 'android',
        },
      },
    });

    expect(getPlatform({ fallback: '' })).toEqual('android');
  });

  it('should return value from CLI options for start command', () => {
    process.env[CLI_OPTIONS_ENV_KEY] = JSON.stringify({
      arguments: {
        start: {
          platform: 'android',
        },
      },
    });

    expect(getPlatform({ fallback: '' })).toEqual('android');
  });
});
