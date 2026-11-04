import { mobile } from '@e2e-dev/mobile';
import type { E2EConfig } from 'e2e';

export default {
  tests: 'e2e/**/*.e2e.ts',
  retries: 0,
  workers: 1,
  targets: [
    {
      name: 'android',
      engine: mobile({ platform: 'android', device: process.env.E2E_DEVICE }),
      app: { bundleId: 'com.tester.federationV2' },
    },
    {
      name: 'ios',
      engine: mobile({ platform: 'ios', device: process.env.E2E_DEVICE }),
      app: { bundleId: 'com.tester.federationV2' },
    },
  ],
} satisfies E2EConfig;
