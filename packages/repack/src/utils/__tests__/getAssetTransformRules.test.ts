import { describe, expect, it } from 'vitest';
import { getAssetTransformRules } from '../getAssetTransformRules.js';

describe('getAssetTransformRules', () => {
  it('should return default asset transform rules when no options provided', () => {
    const rules = getAssetTransformRules();
    expect(rules).toMatchSnapshot();
  });

  it('should return rules with inline option when provided', () => {
    const rules = getAssetTransformRules({ inline: true });

    // @ts-ignore
    expect(rules[0]?.use?.options?.inline).toEqual(true);
    expect(rules).toMatchSnapshot();
  });

  it('should return rules with remote options when provided', () => {
    const remoteOptions = { publicPath: 'https://example.com/assets' };
    const rules = getAssetTransformRules({ remote: remoteOptions });

    // @ts-ignore
    expect(rules[0]?.use?.options?.remote).toHaveProperty('enabled', true);
    expect(rules).toMatchSnapshot();
  });

  it('should add SVGR rule when svg="svgr"', () => {
    const rules = getAssetTransformRules({ svg: 'svgr' });

    expect(rules).toHaveLength(2);
    expect(rules[1]?.use?.loader).toEqual('@svgr/webpack');
    expect(rules).toMatchSnapshot();
  });

  it('should add XML rule when svg="xml"', () => {
    const rules = getAssetTransformRules({ svg: 'xml' });

    expect(rules).toHaveLength(2);
    // @ts-ignore
    expect(rules[1]?.type).toEqual('asset/source');
    expect(rules).toMatchSnapshot();
  });

  it('should add URI rule when svg="uri"', () => {
    const rules = getAssetTransformRules({ svg: 'uri' });

    expect(rules).toHaveLength(2);
    // @ts-ignore
    expect(rules[1]?.type).toEqual('asset/inline');
    expect(rules).toMatchSnapshot();
  });

  it('should exclude .svg from main asset extensions when svg option is provided', () => {
    const rules = getAssetTransformRules({ svg: 'uri' });
    const ruleTest = rules[0]?.test;
    expect(ruleTest.test('test.svg')).toEqual(false);
  });
});
