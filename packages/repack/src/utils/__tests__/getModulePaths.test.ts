import { getModulePaths } from '../getModulePaths';

describe('getModulePaths', () => {
  const packages = [
    'react-native',
    'react-native-windows',
    'react-native-macos',
    'react-native-tvos',
    '@callstack/react-native-visionos',
    '@react-native/core',
    '@babel/core',
    '@types/react',
    '@expo/vector-icons',
    'socket.io',
  ];

  it.each(packages)('should generate classic path - %s', (packageName) => {
    const [classicPath] = getModulePaths([packageName]);

    const classicTest = `node_modules/${packageName}/`;
    expect(classicPath.test(classicTest)).toBe(true);
  });

  it.each(packages)('should generate exotic path - %s', (packageName) => {
    const [_, exoticPath] = getModulePaths([packageName]);
    const exoticPackageName = packageName.replace(/[/\\]/g, '+');

    const exoticTestAtSymbol = `node_modules/.pnpm/${exoticPackageName}@`;
    const exoticTestPlusSymbol = `node_modules/.pnpm/${exoticPackageName}+`;

    expect(exoticPath.test(exoticTestAtSymbol)).toBe(true);
    expect(exoticPath.test(exoticTestPlusSymbol)).toBe(true);
  });

  it.each(packages)('should handle backslashes - %s', (packageName) => {
    const [classicPath, exoticPath] = getModulePaths([packageName]);
    const exoticPackageName = packageName.replace(/[/\\]/g, '+');

    const classicTestBackslash = `node_modules\\${packageName}\\`;
    const exoticTestAtSymbolBackslash = `node_modules\\.pnpm\\${exoticPackageName}@`;
    const exoticTestPlusSymbolBackslash = `node_modules\\.pnpm\\${exoticPackageName}+`;

    expect(classicPath.test(classicTestBackslash)).toBe(true);
    expect(exoticPath.test(exoticTestAtSymbolBackslash)).toBe(true);
    expect(exoticPath.test(exoticTestPlusSymbolBackslash)).toBe(true);
  });
});
