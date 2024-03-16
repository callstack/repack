jest.doMock('./resolver/__tests__/utils', () => {
  const originalModule = jest.requireActual('./resolver/__tests__/utils');
  return {
    createPackageAccessors(...args) {
      return {
        ...originalModule.createPackageAccessors(...args),
        __fileMap: args[0],
      };
    },
    createResolutionContext(...args) {
      return {
        ...originalModule.createResolutionContext(...args),
        __options: args[1],
      };
    },
  };
});
