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

  const paths = getModulePaths(packages);

  // Classic paths are even-indexed
  const classicPaths = paths.filter((_, index) => index % 2 === 0);
  // Exotic paths are odd-indexed
  const exoticPaths = paths.filter((_, index) => index % 2 !== 0);

  packages.forEach((packageName, index) => {
    it(`should generate classic path - ${packageName}`, () => {
      const classicPath = classicPaths[index];

      const classicTest = `node_modules/${packageName}/`;

      expect(classicPath.test(classicTest)).toBe(true);
    });

    it(`should generate exotic path - ${packageName}`, () => {
      const exoticPath = exoticPaths[index];
      const exoticPackageName = packageName.replace(/[/\\]/g, '+');

      const exoticTestAtSymbol = `node_modules/.pnpm/${exoticPackageName}@`;
      const exoticTestPlusSymbol = `node_modules/.pnpm/${exoticPackageName}+`;

      expect(exoticPath.test(exoticTestAtSymbol)).toBe(true);
      expect(exoticPath.test(exoticTestPlusSymbol)).toBe(true);
    });

    it(`should handle backslashes - ${packageName}`, () => {
      const classicPath = classicPaths[index];
      const exoticPath = exoticPaths[index];

      const exoticPackageName = packageName.replace(/[/\\]/g, '+');

      const classicTestBackslash = `node_modules\\${packageName}\\`;
      const exoticTestAtSymbolBackslash = `node_modules\\.pnpm\\${exoticPackageName}@`;
      const exoticTestPlusSymbolBackslash = `node_modules\\.pnpm\\${exoticPackageName}+`;

      expect(classicPath.test(classicTestBackslash)).toBe(true);
      expect(exoticPath.test(exoticTestAtSymbolBackslash)).toBe(true);
      expect(exoticPath.test(exoticTestPlusSymbolBackslash)).toBe(true);
    });
  });
});
