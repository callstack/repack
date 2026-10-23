import { bundle } from '../bundle.js';
import { createBoundCommands } from '../index.js';
import type { BundleArguments, CliConfig, StartArguments } from '../types.js';

jest.mock('../bundle.js');
jest.mock('../federationDoctor.js');
jest.mock('../federationManifest.js');
jest.mock('../start.js');

const cliConfig: CliConfig = {
  root: '/project',
  platforms: ['ios'],
  reactNativePath: '/project/node_modules/react-native',
};

const args = {
  dev: true,
  host: '',
  platform: 'ios',
} satisfies BundleArguments & StartArguments;

describe('createBoundCommands', () => {
  const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();

  test('warns when the bound command overrides --bundler', async () => {
    const [command] = createBoundCommands('webpack');

    await command.func([], cliConfig, { ...args, bundler: 'rspack' });

    expect(consoleWarn).toHaveBeenCalledWith(
      'Ignoring "--bundler rspack" because the deprecated "@callstack/repack/commands/webpack" entry point explicitly selects webpack. Use "@callstack/repack/commands" to select a bundler with --bundler.'
    );
    expect(bundle).toHaveBeenCalledWith(
      [],
      cliConfig,
      { ...args, bundler: 'rspack' },
      'webpack'
    );
  });

  test.each([undefined, 'webpack' as const])(
    'does not warn when --bundler is %s',
    async (bundler) => {
      const [command] = createBoundCommands('webpack');

      await command.func([], cliConfig, { ...args, bundler });

      expect(consoleWarn).not.toHaveBeenCalled();
    }
  );
});
