import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';
import { ExpoPlugin } from '@callstack/repack-expo/rspack';

const require = createRequire(import.meta.url);
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// Must match the host's shared list. Versions come from the installed
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
    throw new Error(
      'tester-expo-widget requires PLATFORM=ios or PLATFORM=android'
    );
  }

  const remoteOutputPath = path.join(projectRoot, 'build', 'remote', platform);
  const remotePublicPath = `http://localhost:8082/${platform}/remote-assets`;

  return {
    context: projectRoot,
    devServer,
    devtool: 'source-map',
    mode,
    name: platform,
    module: {
      rules: Repack.getAssetTransformRules({
        remote: { publicPath: remotePublicPath },
      }),
    },
    output: {
      clean: true,
      path: path.join(projectRoot, 'build', 'rspack', platform),
      publicPath: `http://localhost:8082/${platform}/`,
      uniqueName: `tester-expo-widget-${platform}`,
    },
    plugins: [
      new ExpoPlugin({
        platform,
        repack: {
          output: {
            auxiliaryAssetsPath: remoteOutputPath,
          },
          extraChunks: [
            {
              include: /.*/,
              type: 'remote',
              outputPath: remoteOutputPath,
            },
          ],
        },
      }),
      new Repack.plugins.ModuleFederationPluginV2({
        name: 'ExpoWidget',
        filename: 'ExpoWidget.container.js.bundle',
        exposes: {
          './Widget': './src/Widget',
        },
        dts: false,
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
