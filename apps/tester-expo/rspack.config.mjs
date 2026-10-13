import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';
import { ExpoPlugin } from '@callstack/repack-expo/rspack';
import { ReanimatedPlugin } from '@callstack/repack-plugin-reanimated';

const require = createRequire(import.meta.url);
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// Must match the widget's shared list. Versions come from the installed
// packages so they follow the workspace catalogs.
const SHARED_SINGLETONS = [
  'react',
  'react-native',
  'expo-constants',
  'expo-asset',
  'expo-font',
];

export default (env) => {
  const {
    mode = 'development',
    platform = process.env.PLATFORM,
    devServer,
  } = env;

  if (platform !== 'ios' && platform !== 'android') {
    throw new Error('tester-expo requires PLATFORM=ios or PLATFORM=android');
  }

  return {
    context: projectRoot,
    devServer,
    devtool: 'source-map',
    mode,
    name: platform,
    output: {
      clean: true,
      path: path.join(projectRoot, 'build', 'rspack', platform),
      uniqueName: `tester-expo-${platform}`,
    },
    plugins: [
      new ReanimatedPlugin({ unstable_disableTransform: true }),
      new ExpoPlugin({ platform }),
      new Repack.plugins.ModuleFederationPluginV2({
        name: 'ExpoHost',
        dts: false,
        remotes: {
          ExpoWidget: `ExpoWidget@http://localhost:8082/${platform}/mf-manifest.json`,
          OrdinaryWidget: `OrdinaryWidget@http://localhost:8083/${platform}/mf-manifest.json`,
        },
        shared: Object.fromEntries(
          SHARED_SINGLETONS.map((name) => [
            name,
            {
              singleton: true,
              eager: true,
              requiredVersion: require(`${name}/package.json`).version,
            },
          ])
        ),
      }),
    ],
  };
};
