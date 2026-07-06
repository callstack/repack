// Loading '@rspack/core' at require time would crash with ERR_REQUIRE_ESM
// on Node versions unsupported by Rspack 2, before the Node compatibility
// guard has a chance to run. This mock turns any eager load into a test
// failure. Note that bundle.js/start.js are deliberately NOT mocked here,
// so this fails if the commands module ever imports them eagerly again.
jest.mock('@rspack/core', () => {
  throw new Error(
    '@rspack/core must not be loaded when the rspack commands module is imported'
  );
});

describe('rspack commands module', () => {
  it('registers commands without loading @rspack/core', () => {
    expect(() => require('../index.js')).not.toThrow();
  });

  it('exposes the expected commands', () => {
    const commands: typeof import('../index.js').default =
      require('../index.js').default;

    expect(commands.map((command) => command.name)).toEqual([
      'bundle',
      'webpack-bundle',
      'start',
      'webpack-start',
    ]);

    for (const command of commands) {
      expect(typeof command.func).toBe('function');
    }
  });
});
