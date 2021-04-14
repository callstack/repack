import { CLI_OPTIONS_ENV_KEY } from '../../../../env';
import { getContext } from '../getContext';

describe('getContext', () => {
  beforeEach(() => {
    delete process.env[CLI_OPTIONS_ENV_KEY];
  });

  it('should return fallback value', () => {
    expect(getContext()).toEqual(process.cwd());
    expect(getContext({ fallback: '/hello/project' })).toEqual(
      '/hello/project'
    );
  });

  it('should return value from CLI options', () => {
    process.env[CLI_OPTIONS_ENV_KEY] = JSON.stringify({
      config: {
        root: '/x/y/z',
      },
    });

    expect(getContext()).toEqual('/x/y/z');
  });
});
