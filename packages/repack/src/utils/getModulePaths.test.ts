import { getModulePaths } from './getModulePaths';

describe('getModulePaths', () => {
  const testCases = [
    {
      category: 'Un-nested package names',
      examples: [
        'react-native',
        'react-native-windows',
        'react-native-macos',
        'react-native-tvos',
        'lodash',
        'express',
        'axios',
        'moment',
        'socket.io',
      ],
    },
    {
      category: 'Nested package names',
      examples: [
        '@callstack/react-native-visionos',
        '@react-native/core',
        '@babel/core',
        '@types/react',
        '@expo/vector-icons',
      ],
    },
  ];

  testCases.forEach(({ category, examples }) => {
    describe(category, () => {
      examples.forEach((packageName) => {
        test(packageName, () => {
          const [classicPath, exoticPath] = getModulePaths(packageName);

          const classicTest = `node_modules/${packageName}/`;
          const classicTestBackslash = `node_modules\\${packageName}\\`;

          const exoticPackageName = packageName.replace(/[/\\]/g, '+');
          const exoticTestAtSymbol = `node_modules/.pnpm/${exoticPackageName}@`;
          const exoticTestAtSymbolBackslash = `node_modules\\.pnpm\\${exoticPackageName}@`;
          const exoticTestPlusSymbol = `node_modules/.pnpm/${exoticPackageName}+`;
          const exoticTestPlusSymbolBackslash = `node_modules\\.pnpm\\${exoticPackageName}+`;

          expect(classicPath.test(classicTest)).toBe(true);
          expect(classicPath.test(classicTestBackslash)).toBe(true);

          expect(exoticPath.test(exoticTestAtSymbol)).toBe(true);
          expect(exoticPath.test(exoticTestAtSymbolBackslash)).toBe(true);

          expect(exoticPath.test(exoticTestPlusSymbol)).toBe(true);
          expect(exoticPath.test(exoticTestPlusSymbolBackslash)).toBe(true);
        });
      });
    });
  });
});
