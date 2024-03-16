jest.doMock('./resolver/__tests__/utils', () => {
  const originalModule = jest.requireActual('./resolver/__tests__/utils');
  return {
    createPackageAccessors(...args) {
      return {
        ...originalModule.createPackageAccessors(...args),
        __additionalFileMap: args[0],
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
