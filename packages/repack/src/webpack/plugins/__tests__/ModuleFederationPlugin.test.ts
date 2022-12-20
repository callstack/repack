import { Compiler, container } from 'webpack';
import { ModuleFederationPlugin } from '../ModuleFederationPlugin';

jest.mock('webpack', () => ({
  container: {
    ModuleFederationPlugin: jest.fn().mockReturnValue({
      apply: jest.fn(),
    }),
  },
}));

describe('ModuleFederationPlugin', () => {
  it('should replace RemotesObject remotes', () => {
    new ModuleFederationPlugin({
      remotes: {
        external: 'external1@dynamic',
      },
    }).apply(jest.fn() as any);

    let config = (container.ModuleFederationPlugin as jest.Mock).mock
      .calls[0][0];
    expect(config.remotes.external).toMatch('promise new Promise');
    (container.ModuleFederationPlugin as jest.Mock).mockClear();

    new ModuleFederationPlugin({
      remotes: {
        external: ['external1@dynamic', 'external2@dynamic'],
      },
    }).apply(jest.fn() as any);

    config = (container.ModuleFederationPlugin as jest.Mock).mock.calls[0][0];
    expect(config.remotes.external[0]).toMatch('promise new Promise');
    expect(config.remotes.external[1]).toMatch('promise new Promise');
    (container.ModuleFederationPlugin as jest.Mock).mockClear();
  });

  it('should replace string[] remotes', () => {
    new ModuleFederationPlugin({
      remotes: ['remote1@dynamic', 'remote2@dynamic'],
    }).apply(jest.fn() as any);

    const config = (container.ModuleFederationPlugin as jest.Mock).mock
      .calls[0][0];
    expect(config.remotes[0]).toMatch('promise new Promise');
    expect(config.remotes[1]).toMatch('promise new Promise');
    (container.ModuleFederationPlugin as jest.Mock).mockClear();
  });

  it('should replace RemotesObject[] remotes', () => {
    new ModuleFederationPlugin({
      remotes: [
        {
          external: 'external1@dynamic',
        },
        {
          external: ['external2@dynamic', 'external3@dynamic'],
        },
      ],
    }).apply(jest.fn() as any);

    const config = (container.ModuleFederationPlugin as jest.Mock).mock
      .calls[0][0];
    expect(config.remotes[0].external).toMatch('promise new Promise');
    expect(config.remotes[1].external[0]).toMatch('promise new Promise');
    expect(config.remotes[1].external[1]).toMatch('promise new Promise');
    (container.ModuleFederationPlugin as jest.Mock).mockClear();
  });

  it('should not add default resolver for remote', () => {
    new ModuleFederationPlugin({
      remotes: {
        app1: 'app1@dynamic',
      },
    }).apply(jest.fn() as any);
    const config = (container.ModuleFederationPlugin as jest.Mock).mock
      .calls[0][0];
    expect(config.remotes.app1).toMatch('promise new Promise');
    expect(config.remotes.app1).not.toMatch('scriptManager.addResolver');
    (container.ModuleFederationPlugin as jest.Mock).mockClear();
  });

  it('should add default resolver for remote', () => {
    new ModuleFederationPlugin({
      remotes: {
        app1: 'app1@http://localhost:6789/static/app1.container.bundle',
      },
    }).apply(jest.fn() as any);
    const config = (container.ModuleFederationPlugin as jest.Mock).mock
      .calls[0][0];
    expect(config.remotes.app1).toMatch('promise new Promise');
    expect(config.remotes.app1).toMatch('scriptManager.addResolver');
    expect(config.remotes.app1).toMatch(
      'http://localhost:6789/static/app1.container.bundle'
    );
    expect(config.remotes.app1).toMatch(
      'http://localhost:6789/static/[name][ext]'
    );
    (container.ModuleFederationPlugin as jest.Mock).mockClear();
  });

  it('should use unique name from config', () => {
    class MockCompiler {
      options: any = {
        output: {},
      };
    }

    const mockCompilerInstance = new MockCompiler();

    new ModuleFederationPlugin({
      name: 'uniqueModuleName',
      exposes: {
        './Home': './src/Home.ts',
      },
    }).apply(mockCompilerInstance as Compiler);

    expect(mockCompilerInstance.options.output.library.name).toMatch(
      'uniqueModuleName'
    );
    (container.ModuleFederationPlugin as jest.Mock).mockClear();
  });
});
