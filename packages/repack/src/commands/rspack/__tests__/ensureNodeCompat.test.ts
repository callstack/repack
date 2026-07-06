import { CLIError, getRspackVersion } from '../../../helpers/index.js';
import { ensureNodeSupportsRspack } from '../ensureNodeCompat.js';

jest.mock('../../../helpers/index.js', () => ({
  ...jest.requireActual<typeof import('../../../helpers/index.js')>(
    '../../../helpers/index.js'
  ),
  getRspackVersion: jest.fn(),
}));

const getRspackVersionMock = jest.mocked(getRspackVersion);

// `process.versions.node` is a read-only property, so it cannot be
// mocked with `jest.replaceProperty` - redefine it manually instead.
const originalNodeVersion = Object.getOwnPropertyDescriptor(
  process.versions,
  'node'
);

const setup = (rspackVersion: string | null, nodeVersion: string) => {
  getRspackVersionMock.mockReturnValue(rspackVersion);
  Object.defineProperty(process.versions, 'node', {
    value: nodeVersion,
    configurable: true,
  });
};

afterAll(() => {
  if (originalNodeVersion) {
    Object.defineProperty(process.versions, 'node', originalNodeVersion);
  }
});

describe('ensureNodeSupportsRspack', () => {
  it('does nothing when @rspack/core is not resolvable', () => {
    setup(null, '18.20.0');
    expect(() => ensureNodeSupportsRspack()).not.toThrow();
  });

  it('does nothing for Rspack 1.x regardless of Node version', () => {
    setup('1.5.8', '18.20.0');
    expect(() => ensureNodeSupportsRspack()).not.toThrow();
  });

  it.each(['18.20.0', '20.18.3', '21.7.3', '22.11.0'])(
    'throws CLIError for Rspack 2 on unsupported Node %s',
    (nodeVersion) => {
      setup('2.0.0', nodeVersion);
      expect(() => ensureNodeSupportsRspack()).toThrow(CLIError);
    }
  );

  it.each(['20.19.0', '20.19.4', '22.12.0', '24.0.0'])(
    'does nothing for Rspack 2 on supported Node %s',
    (nodeVersion) => {
      setup('2.0.0', nodeVersion);
      expect(() => ensureNodeSupportsRspack()).not.toThrow();
    }
  );

  it('treats prerelease Rspack 2 versions as Rspack 2', () => {
    setup('2.0.0-beta.1', '18.20.0');
    expect(() => ensureNodeSupportsRspack()).toThrow(CLIError);
  });

  it('reports both the Rspack and Node versions in the error', () => {
    setup('2.0.0', '18.20.0');
    expect(() => ensureNodeSupportsRspack()).toThrow(
      /Rspack 2\.0\.0 requires Node\.js .+ found 18\.20\.0/
    );
  });
});
