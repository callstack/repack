import { getCliOverrides } from '../getCliOverrides.js';

describe('getCliOverrides', () => {
  describe('bundle command', () => {
    it('should return overrides with entry when entryFile is provided', () => {
      expect(
        getCliOverrides({
          args: {
            platform: 'ios',
            dev: false,
            minify: true,
            entryFile: 'index.js',
          },
          command: 'bundle',
        })
      ).toEqual({
        mode: 'production',
        optimization: { minimize: true },
        entry: './index.js',
      });
    });

    it('should normalize relative entryFile to start with ./', () => {
      expect(
        getCliOverrides({
          args: { platform: 'ios', dev: true, entryFile: 'src/main.js' },
          command: 'bundle',
        })
      ).toEqual({
        mode: 'development',
        optimization: { minimize: undefined },
        entry: './src/main.js',
      });
    });

    it('should preserve absolute entryFile as-is', () => {
      expect(
        getCliOverrides({
          args: { platform: 'ios', dev: false, entryFile: '/app/src/index.js' },
          command: 'bundle',
        })
      ).toEqual({
        mode: 'production',
        optimization: { minimize: undefined },
        entry: '/app/src/index.js',
      });
    });

    it('should preserve entryFile starting with ./ as-is', () => {
      expect(
        getCliOverrides({
          args: { platform: 'ios', dev: false, entryFile: './src/index.js' },
          command: 'bundle',
        })
      ).toEqual({
        mode: 'production',
        optimization: { minimize: undefined },
        entry: './src/index.js',
      });
    });

    it('should not set entry when entryFile is omitted', () => {
      const result = getCliOverrides({
        args: { platform: 'ios', dev: false },
        command: 'bundle',
      });

      expect(result).toEqual({
        mode: 'production',
        optimization: { minimize: undefined },
      });
      expect(result).not.toHaveProperty('entry');
    });
  });

  describe('start command', () => {
    it('should return devServer overrides', () => {
      expect(
        getCliOverrides({
          args: { host: 'localhost', port: 8081 },
          command: 'start',
        })
      ).toEqual({
        devServer: {
          port: 8081,
          host: 'localhost',
          server: undefined,
        },
      });
    });

    it('should include https server config when https is enabled', () => {
      expect(
        getCliOverrides({
          args: {
            host: 'localhost',
            port: 8081,
            https: true,
            key: '/path/to/key.pem',
            cert: '/path/to/cert.pem',
          },
          command: 'start',
        })
      ).toEqual({
        devServer: {
          port: 8081,
          host: 'localhost',
          server: {
            type: 'https',
            options: {
              key: '/path/to/key.pem',
              cert: '/path/to/cert.pem',
            },
          },
        },
      });
    });
  });
});
