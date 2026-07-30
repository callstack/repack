import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';
import { ExpoPlugin } from '@callstack/repack-expo/rspack';
import { ReanimatedPlugin } from '@callstack/repack-plugin-reanimated';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

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
        shared: {
          react: {
            singleton: true,
            eager: true,
            requiredVersion: '19.2.3',
          },
          'react-native': {
            singleton: true,
            eager: true,
            requiredVersion: '0.85.3',
          },
          'expo-constants': {
            singleton: true,
            eager: true,
            requiredVersion: '~56.0.16',
          },
          'expo-asset': {
            singleton: true,
            eager: true,
            requiredVersion: '~56.0.21',
          },
          'expo-font': {
            singleton: true,
            eager: true,
            requiredVersion: '~56.0.7',
          },
        },
      }),
    ],
  };
};
