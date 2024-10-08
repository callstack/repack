import { getModulePaths } from '../getModulePaths';

describe('getModulePaths', () => {
  const packageName = 'react-native';
  const [classicPath, exoticPath] = getModulePaths([packageName]);

  it('should generate classic path', () => {
    const classicTest = `node_modules/${packageName}/`;
    expect(classicPath.test(classicTest)).toBe(true);
  });

  it('should generate exotic path', () => {
    const exoticPackageName = packageName.replace(/[/\\]/g, '+');

    const exoticTestAtSymbol = `node_modules/.pnpm/${exoticPackageName}@`;
    const exoticTestPlusSymbol = `node_modules/.pnpm/${exoticPackageName}+`;

    expect(exoticPath.test(exoticTestAtSymbol)).toBe(true);
    expect(exoticPath.test(exoticTestPlusSymbol)).toBe(true);
  });

  it('should handle backslashes', () => {
    const exoticPackageName = packageName.replace(/[/\\]/g, '+');

    const classicTestBackslash = `node_modules\\${packageName}\\`;
    const exoticTestAtSymbolBackslash = `node_modules\\.pnpm\\${exoticPackageName}@`;
    const exoticTestPlusSymbolBackslash = `node_modules\\.pnpm\\${exoticPackageName}+`;

    expect(classicPath.test(classicTestBackslash)).toBe(true);
    expect(exoticPath.test(exoticTestAtSymbolBackslash)).toBe(true);
    expect(exoticPath.test(exoticTestPlusSymbolBackslash)).toBe(true);
  });
});
