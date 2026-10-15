import { mobile } from '@e2e-dev/mobile';
import type { E2EConfig } from 'e2e';

export default {
  tests: 'e2e/**/*.e2e.ts',
  targets: [
    {
      name: 'android',
      engine: mobile({ platform: 'android' }),
      app: { bundleId: 'com.tester.federationV2' },
    },
    {
      name: 'ios',
      engine: mobile({ platform: 'ios' }),
      app: { bundleId: 'com.tester.federationV2' },
    },
  ],
} satisfies E2EConfig;
