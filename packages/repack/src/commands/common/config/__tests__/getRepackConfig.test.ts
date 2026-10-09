import { getRepackConfig } from '../getRepackConfig.js';

jest.mock('../getMinimizerConfig.js');

describe('getRepackConfig', () => {
  it("should set exportsPresence to 'auto' for Rspack", async () => {
    const config = await getRepackConfig('rspack', '/project');

    expect(config.module).toEqual({
      parser: { javascript: { exportsPresence: 'auto' } },
    });
    expect(config).not.toHaveProperty('experiments');
  });

  it('should leave module options to webpack defaults', async () => {
    const config = await getRepackConfig('webpack', '/project');

    expect(config.module).toBeUndefined();
  });
});
