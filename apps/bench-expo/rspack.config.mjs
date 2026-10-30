import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ExpoPlugin } from '@callstack/repack-expo/rspack';
import { ReanimatedPlugin } from '@callstack/repack-plugin-reanimated';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// Same as apps/tester-expo/rspack.config.mjs minus Module Federation, so the
// output is comparable with Metro's.
export default (env) => {
  const {
    mode = 'development',
    platform = process.env.PLATFORM,
    devServer,
  } = env;

  if (platform !== 'ios' && platform !== 'android') {
    throw new Error('bench-expo requires PLATFORM=ios or PLATFORM=android');
  }

  return {
    context: projectRoot,
    devServer,
    devtool: 'source-map',
    mode,
    name: platform,
    output: {
      clean: true,
      path:
        process.env.BENCH_OUTPUT_DIR ??
        path.join(projectRoot, 'build', 'rspack', platform),
      uniqueName: `bench-expo-${platform}`,
    },
    plugins: [
      new ReanimatedPlugin({ unstable_disableTransform: true }),
      new ExpoPlugin({ platform }),
    ],
    // Opt-in for the benchmark's "persistent cache" variant; Metro caches
    // transforms by default.
    ...(process.env.BENCH_RSPACK_CACHE && {
      cache: true,
      experiments: {
        cache: {
          type: 'persistent',
          storage: {
            type: 'filesystem',
            directory: path.join(projectRoot, 'node_modules/.cache/rspack'),
          },
        },
      },
    }),
  };
};
