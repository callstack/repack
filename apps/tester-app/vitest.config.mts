import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      // These suites boot a real dev server, so the process is not a unit-test
      // environment as far as @react-native/dev-middleware is concerned. Since
      // 0.86 its DefaultToolLauncher throws under NODE_ENV=test unless the
      // caller injects a mock launcher.
      NODE_ENV: 'development',
    },
  },
});
