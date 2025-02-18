import { getResolveOptions } from '../getResolveOptions.js';

const resolveOptionsObject = {
  extensions: expect.any(Array),
  aliasFields: expect.any(Array),
  conditionNames: expect.any(Array),
  exportsFields: expect.any(Array),
  importsFields: expect.any(Array),
  extensionAlias: expect.any(Object),
};

describe('getResolveOptions', () => {
  it('should accept both platform and options parameters', () => {
    const result = getResolveOptions('ios', { enablePackageExports: true });
    expect(result).toBeDefined();
    expect(result).toMatchObject(resolveOptionsObject);
  });

  it('should accept just platform parameter', () => {
    const result = getResolveOptions('ios');
    expect(result).toBeDefined();
    expect(result).toMatchObject(resolveOptionsObject);
  });

  it('should accept just options parameter', () => {
    const result = getResolveOptions({ enablePackageExports: true });
    expect(result).toBeDefined();
    expect(result).toMatchObject(resolveOptionsObject);
  });

  it('should work with no parameters', () => {
    const result = getResolveOptions();
    expect(result).toBeDefined();
    expect(result).toMatchObject(resolveOptionsObject);
  });

  it('should use [platform] placeholder when no platform provided', () => {
    const result = getResolveOptions();
    expect(result).toBeDefined();
    expect(result.extensions).toContain('.[platform].js');
    expect(result.extensions).not.toContain('.ios.js');
    expect(result.extensions).not.toContain('.android.js');
  });

  it('should use actual platform value when provided', () => {
    const result = getResolveOptions('ios');
    expect(result).toBeDefined();
    expect(result.extensions).toContain('.ios.js');
    expect(result.extensions).not.toContain('.[platform].js');
  });
});
