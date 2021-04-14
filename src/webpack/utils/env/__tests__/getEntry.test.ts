import { CLI_OPTIONS_ENV_KEY } from '../../../../env';
import { getEntry } from '../getEntry';

describe('getEntry', () => {
  beforeEach(() => {
    delete process.env[CLI_OPTIONS_ENV_KEY];
  });

  it('should return fallback value', () => {
    expect(getEntry()).toEqual('./index.js');
    expect(getEntry({ fallback: './app.js' })).toEqual('./app.js');
  });

  it('should return value from CLI options for bundle command', () => {
    process.env[CLI_OPTIONS_ENV_KEY] = JSON.stringify({
      arguments: {
        bundle: {
          entryFile: 'main.js',
        },
      },
    });

    expect(getEntry()).toEqual('./main.js');

    process.env[CLI_OPTIONS_ENV_KEY] = JSON.stringify({
      arguments: {
        bundle: {
          entryFile: '/x/y/z/main.js',
        },
      },
    });

    expect(getEntry()).toEqual('/x/y/z/main.js');
  });

  it('should return value from CLI options for start command', () => {
    process.env[CLI_OPTIONS_ENV_KEY] = JSON.stringify({
      arguments: {
        start: {},
      },
    });

    expect(getEntry()).toEqual('./index.js');
    expect(getEntry({ fallback: './app.js' })).toEqual('./app.js');
  });
});
