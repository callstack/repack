import { getModulePaths } from '../getModulePaths';

describe('getModulePaths', () => {
  const examplePackages = [
    'react-native',
    'react-native-windows',
    'react-native-macos',
    'react-native-tvos',
    '@callstack/react-native-visionos',
    '@react-native/core',
    '@babel/core',
    '@types/react',
    '@expo/vector-icons',
    'lodash',
    'axios',
    'moment',
    'socket.io',
  ];

  it.each(examplePackages)(
    'should correctly generate classic paths',
    (packageName) => {
      test(packageName, () => {
        const [classicPath] = getModulePaths(packageName);

        const classicTest = `node_modules/${packageName}/`;
        const classicTestBackslash = `node_modules\\${packageName}\\`;

        expect(classicPath.test(classicTest)).toBe(true);
        expect(classicPath.test(classicTestBackslash)).toBe(true);
      });
    }
  );

  it.each(examplePackages)(
    'should correctly generate exotic paths',
    (packageName) => {
      test(packageName, () => {
        const [_, exoticPath] = getModulePaths(packageName);

        const exoticPackageName = packageName.replace(/[/\\]/g, '+');
        const exoticTestAtSymbol = `node_modules/.pnpm/${exoticPackageName}@`;
        const exoticTestPlusSymbol = `node_modules/.pnpm/${exoticPackageName}+`;

        expect(exoticPath.test(exoticTestAtSymbol)).toBe(true);
        expect(exoticPath.test(exoticTestPlusSymbol)).toBe(true);
      });
    }
  );

  it.each(examplePackages)('should handle backslashes', (packageName) => {
    test(packageName, () => {
      const [classicPath, exoticPath] = getModulePaths(packageName);

      const classicTestBackslash = `node_modules\\${packageName}\\`;

      const exoticPackageName = packageName.replace(/[/\\]/g, '+');
      const exoticTestAtSymbolBackslash = `node_modules\\.pnpm\\${exoticPackageName}@`;
      const exoticTestPlusSymbolBackslash = `node_modules\\.pnpm\\${exoticPackageName}+`;

      expect(classicPath.test(classicTestBackslash)).toBe(true);
      expect(exoticPath.test(exoticTestAtSymbolBackslash)).toBe(true);
      expect(exoticPath.test(exoticTestPlusSymbolBackslash)).toBe(true);
    });
  });
});
