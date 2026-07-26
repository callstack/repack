import type {
  BundleArguments,
  CliConfig,
  StartArguments,
} from '../../types.js';
import { bundle } from '../bundle.js';
import { ensureNodeSupportsRspack } from '../ensureNodeCompat.js';
import commands from '../index.js';
import { start } from '../start.js';

// safety net: any code path that loads '@rspack/core' fails loudly
jest.mock('@rspack/core', () => {
  throw new Error(
    '@rspack/core must not be loaded before the Node compatibility guard runs'
  );
});

jest.mock('../ensureNodeCompat.js', () => ({
  ensureNodeSupportsRspack: jest.fn(),
}));
jest.mock('../bundle.js', () => ({ bundle: jest.fn() }));
jest.mock('../start.js', () => ({ start: jest.fn() }));

const guardMock = jest.mocked(ensureNodeSupportsRspack);
const bundleMock = jest.mocked(bundle);
const startMock = jest.mocked(start);

const [bundleCommand, webpackBundleCommand, startCommand, webpackStartCommand] =
  commands;

const cliConfig: CliConfig = {
  root: '/project',
  platforms: ['ios', 'android'],
  reactNativePath: '/project/node_modules/react-native',
};

const bundleArgs: BundleArguments = { platform: 'ios', dev: true };
const startArgs: StartArguments = { host: '' };

describe('lazy rspack commands', () => {
  it.each([
    ['bundle', bundleCommand],
    ['webpack-bundle', webpackBundleCommand],
  ] as const)(
    '%s runs the Node compatibility guard before delegating to bundle',
    async (_name, command) => {
      await command.func([], cliConfig, bundleArgs);

      expect(guardMock).toHaveBeenCalledTimes(1);
      expect(bundleMock).toHaveBeenCalledWith([], cliConfig, bundleArgs);
      expect(guardMock.mock.invocationCallOrder[0]).toBeLessThan(
        bundleMock.mock.invocationCallOrder[0]
      );
    }
  );

  it.each([
    ['start', startCommand],
    ['webpack-start', webpackStartCommand],
  ] as const)(
    '%s runs the Node compatibility guard before delegating to start',
    async (_name, command) => {
      await command.func([], cliConfig, startArgs);

      expect(guardMock).toHaveBeenCalledTimes(1);
      expect(startMock).toHaveBeenCalledWith([], cliConfig, startArgs);
      expect(guardMock.mock.invocationCallOrder[0]).toBeLessThan(
        startMock.mock.invocationCallOrder[0]
      );
    }
  );

  it('does not run bundle when the guard throws', async () => {
    guardMock.mockImplementationOnce(() => {
      throw new Error('Rspack 2.0.0 requires Node.js ^20.19.0 || >=22.12.0');
    });

    await expect(bundleCommand.func([], cliConfig, bundleArgs)).rejects.toThrow(
      'Rspack 2.0.0 requires Node.js'
    );
    expect(bundleMock).not.toHaveBeenCalled();
  });

  it('does not run start when the guard throws', async () => {
    guardMock.mockImplementationOnce(() => {
      throw new Error('Rspack 2.0.0 requires Node.js ^20.19.0 || >=22.12.0');
    });

    await expect(startCommand.func([], cliConfig, startArgs)).rejects.toThrow(
      'Rspack 2.0.0 requires Node.js'
    );
    expect(startMock).not.toHaveBeenCalled();
  });
});
