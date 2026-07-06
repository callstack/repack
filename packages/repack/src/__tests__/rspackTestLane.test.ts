import { rspackVersion } from '@rspack/core';

// Guards the dual-major test wiring itself: the custom Jest environment
// (jest.environment.js) loads @rspack/core v2 by default and the aliased
// @rspack/core-v1 under RSPACK_MAJOR=1. If the env var stops being honored,
// the "v1 lane" silently tests v2 twice - this catches that.
test('the loaded @rspack/core major matches the requested RSPACK_MAJOR lane', () => {
  const requested = Number(process.env.RSPACK_MAJOR ?? '2');
  expect(Number(rspackVersion.split('.')[0])).toBe(requested);
});
