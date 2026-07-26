import { getRspackMajorVersion } from '../../../../helpers/index.js';
import { getRepackConfig } from '../getRepackConfig.js';

jest.mock('../getMinimizerConfig.js');
jest.mock('../../../../helpers/index.js', () => ({
  ...jest.requireActual('../../../../helpers/index.js'),
  getRspackMajorVersion: jest.fn(),
}));

const getRspackMajorVersionMock = jest.mocked(getRspackMajorVersion);

describe('getRepackConfig', () => {
  describe('rspack 1', () => {
    beforeEach(() => {
      getRspackMajorVersionMock.mockReturnValue(1);
    });

    it('enables experiments.parallelLoader', async () => {
      const config = await getRepackConfig('rspack', '/project/root');
      expect(config.experiments).toEqual({ parallelLoader: true });
    });

    it('does not override module parser defaults', async () => {
      const config = await getRepackConfig('rspack', '/project/root');
      expect(config.module).toBeUndefined();
    });
  });

  describe('rspack 2', () => {
    beforeEach(() => {
      getRspackMajorVersionMock.mockReturnValue(2);
    });

    it('omits experiments.parallelLoader (removed in Rspack 2)', async () => {
      const config = await getRepackConfig('rspack', '/project/root');
      expect(config.experiments).toBeUndefined();
    });

    it('relaxes exportsPresence to auto to keep Metro-like tolerance', async () => {
      const config = await getRepackConfig('rspack', '/project/root');
      expect(config.module).toEqual({
        parser: { javascript: { exportsPresence: 'auto' } },
      });
    });
  });

  it('falls back to rspack 1 behavior when the rspack version is unresolvable', async () => {
    getRspackMajorVersionMock.mockReturnValue(null);
    const config = await getRepackConfig('rspack', '/project/root');
    expect(config.experiments).toEqual({ parallelLoader: true });
    expect(config.module).toBeUndefined();
  });

  describe('webpack', () => {
    it('sets no rspack-specific experiments or module overrides', async () => {
      const config = await getRepackConfig('webpack', '/project/root');
      expect(config.experiments).toBeUndefined();
      expect(config.module).toBeUndefined();
    });

    it('never probes the installed rspack version', async () => {
      await getRepackConfig('webpack', '/project/root');
      expect(getRspackMajorVersionMock).not.toHaveBeenCalled();
    });
  });
});
