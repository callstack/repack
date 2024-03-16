jest.doMock('./resolver/__tests__/utils', () => {
  const originalModule = jest.requireActual('./resolver/__tests__/utils');
  return {
    createPackageAccessors: originalModule.createPackageAccessors,
    createResolutionContext(...args) {
      return {
        ...originalModule.createResolutionContext(...args),
        __fileMap: args[0],
        __options: args[1],
      };
    },
  };
});
