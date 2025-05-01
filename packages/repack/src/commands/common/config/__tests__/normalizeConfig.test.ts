import { describe, expect, it } from 'vitest';
import type { ConfigurationObject } from '../../../types.js';
import { normalizeConfig } from '../normalizeConfig.js';

describe('normalizeConfig', () => {
  it('should normalize compiler name to platform', () => {
    const config = {} as ConfigurationObject;
    const normalized = normalizeConfig(config, 'ios');
    expect(normalized.name).toBe('ios');
  });

  describe('devServer.host normalization', () => {
    it('should normalize local-ip to localhost', () => {
      const config = {
        devServer: { host: 'local-ip' },
      } as ConfigurationObject;
      const normalized = normalizeConfig(config, 'ios');
      expect(normalized.devServer?.host).toBe('localhost');
    });

    it('should normalize local-ipv4 to 127.0.0.1', () => {
      const config = {
        devServer: { host: 'local-ipv4' },
      } as ConfigurationObject;
      const normalized = normalizeConfig(config, 'ios');
      expect(normalized.devServer?.host).toBe('127.0.0.1');
    });

    it('should normalize local-ipv6 to ::1', () => {
      const config = {
        devServer: { host: 'local-ipv6' },
      } as ConfigurationObject;
      const normalized = normalizeConfig(config, 'ios');
      expect(normalized.devServer?.host).toBe('::1');
    });

    it('should keep custom host unchanged', () => {
      const config = {
        devServer: { host: '192.168.1.1' },
      } as ConfigurationObject;
      const normalized = normalizeConfig(config, 'ios');
      expect(normalized.devServer?.host).toBe('192.168.1.1');
    });
  });

  describe('output.path normalization', () => {
    it('should replace [context] and [platform] placeholders', () => {
      const config = {
        context: '/project',
        output: { path: '[context]/build/[platform]' },
      } as ConfigurationObject;
      const normalized = normalizeConfig(config, 'android');
      expect(normalized.output?.path).toBe('/project/build/android');
    });

    it('should use process.cwd() when context is not provided', () => {
      const config = {
        output: { path: '[context]/build/[platform]' },
      } as ConfigurationObject;
      const normalized = normalizeConfig(config, 'ios');
      expect(normalized.output?.path).toBe(`${process.cwd()}/build/ios`);
    });
  });

  describe('output.publicPath normalization', () => {
    it('should set publicPath to noop if it uses deprecated getPublicPath', () => {
      const config = {
        output: { publicPath: 'DEPRECATED_GET_PUBLIC_PATH' },
      } as ConfigurationObject;
      const normalized = normalizeConfig(config, 'ios');
      expect(normalized.output?.publicPath).toBe('noop:///');
    });

    it('should set publicPath to devServer public path if it uses DEV_SERVER_PUBLIC_PATH', () => {
      const config = {
        devServer: { host: 'example.com', port: 3000 },
        output: { publicPath: 'DEV_SERVER_PUBLIC_PATH' },
      } as ConfigurationObject;
      const normalized = normalizeConfig(config, 'ios');
      expect(normalized.output?.publicPath).toBe(
        'http://example.com:3000/ios/'
      );
    });

    it('should keep custom publicPath unchanged', () => {
      const config = {
        output: { publicPath: 'http://localhost:8081' },
      } as ConfigurationObject;
      const normalized = normalizeConfig(config, 'ios');
      expect(normalized.output?.publicPath).toBe('http://localhost:8081');
    });

    it('should replace [platform] placeholders', () => {
      const config = {
        output: { publicPath: 'http://example.com:3000/[platform]/' },
      } as ConfigurationObject;
      const normalized = normalizeConfig(config, 'ios');
      expect(normalized.output?.publicPath).toBe(
        'http://example.com:3000/ios/'
      );
    });
  });

  describe('resolve.extensions normalization', () => {
    it('should replace [platform] in extensions', () => {
      const config = {
        resolve: { extensions: ['.js', '.[platform].js', '.native.js'] },
      } as ConfigurationObject;
      const normalized = normalizeConfig(config, 'ios');
      expect(normalized.resolve?.extensions).toEqual([
        '.js',
        '.ios.js',
        '.native.js',
      ]);
    });

    it('should override instead of merge extensions arrays', () => {
      const config = {
        resolve: { extensions: ['.js', '.[platform].js'] },
      } as ConfigurationObject;
      const normalized = normalizeConfig(
        {
          ...config,
          resolve: {
            ...config.resolve,
            extensions: ['.ts', '.[platform].ts'],
          },
        },
        'android'
      );
      expect(normalized.resolve?.extensions).toEqual(['.ts', '.android.ts']);
    });
  });
});
