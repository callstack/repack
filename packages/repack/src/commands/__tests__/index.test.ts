import { bundle } from '../bundle.js';
import commands, { createBoundCommands } from '../index.js';
import type { BundleArguments, CliConfig, StartArguments } from '../types.js';

jest.mock('../bundle.js');
jest.mock('../federation-dev.js');
jest.mock('../federationDoctor.js');
jest.mock('../federationInit.js');
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

describe('command registry', () => {
  test('commands reading a positional argument declare it in the name', () => {
    // @react-native-community/cli >= 17 wires plugin commands through
    // commander: a positional that is not declared in the command name never
    // reaches `func` — argv[0] carries the parsed options object instead and
    // `react-native federation-manifest <dir>` crashes in path.resolve.
    // Optional positional declarations make the CLI pass the value through.
    const names = commands.map((command) => command.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'federation-manifest [source]',
        'federation-init [feature-folder]',
      ])
    );
  });

  test('federation-init is a flat command alongside the other federation commands', () => {
    const names = commands.map((command) => command.name);
    expect(names).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^federation-init/),
        'federation-doctor',
        // federation-dev is a flat command too: discoverable by plain name,
        // no positional to declare, outside createBoundCommands.
        'federation-dev',
        expect.stringMatching(/^federation-manifest/),
      ])
    );

    const init = commands.find((command) =>
      command.name.startsWith('federation-init')
    );
    // Flat RN-CLI command object: name/description/options/func, no
    // subcommand tree.
    expect(typeof init?.func).toBe('function');
    expect(Array.isArray(init?.options)).toBe(true);
    expect(typeof init?.description).toBe('string');
    expect(init).not.toHaveProperty('subcommands');
  });

  test('federation-init is not exposed through the deprecated bound entry points', () => {
    const names = createBoundCommands('webpack').map((command) => command.name);
    expect(names.some((name) => name.startsWith('federation-init'))).toBe(
      false
    );
  });
});
