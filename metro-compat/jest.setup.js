// mock imported utils to gain access to __fileMap and __options
jest.doMock('./resolver/__tests__/utils', () => {
  const originalModule = jest.requireActual('./resolver/__tests__/utils');
  return {
    createPackageAccessors(...args) {
      return {
        ...originalModule.createPackageAccessors(...args),
        __fileMapOverrides: args[0],
      };
    },
    createResolutionContext(...args) {
      return {
        ...originalModule.createResolutionContext(...args),
        __fileMap: args[0],
        __options: args[1],
      };
    },
  };
});
