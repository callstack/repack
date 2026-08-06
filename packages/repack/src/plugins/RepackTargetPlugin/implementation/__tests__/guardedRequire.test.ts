import vm from 'node:vm';

const guardedRequireImplementation = require('../guardedRequire');

describe('guardedRequire implementation', () => {
  it('preserves runtime properties in strict mode', () => {
    // Reproduce the strict wrapper emitted when an Rspack runtime is built as
    // ESM. The previous direct assignments threw while copying Function
    // intrinsics before React Native could execute the application entry.
    const result = vm.runInNewContext(`
      (function () {
        'use strict';
        var self = {};
        var factories = { page: function () { return 'page'; } };
        var __webpack_require__ = function originalWebpackRequire(moduleId) {
          return moduleId;
        };
        Object.defineProperty(__webpack_require__, 'm', {
          configurable: true,
          enumerable: false,
          get: function () { return factories; }
        });
        __webpack_require__.federation = { name: 'remote' };

        (${guardedRequireImplementation
          .toString()
          .replaceAll('$globalObject$', 'self')})();

        return {
          value: __webpack_require__('page'),
          factories: __webpack_require__.m,
          federation: __webpack_require__.federation,
          descriptor: Object.getOwnPropertyDescriptor(__webpack_require__, 'm')
        };
      })()
    `);

    expect(result.value).toBe('page');
    expect(result.factories.page()).toBe('page');
    expect(result.federation.name).toBe('remote');
    expect(result.descriptor.enumerable).toBe(false);
    expect(typeof result.descriptor.get).toBe('function');
  });
});
