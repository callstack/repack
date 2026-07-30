import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';
import { ExpoPlugin } from '@callstack/repack-expo/rspack';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

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
      rules:
        mode === 'production'
          ? Repack.getAssetTransformRules({
              remote: { publicPath: remotePublicPath },
            })
          : [],
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
        shared: {
          react: {
            singleton: true,
            eager: true,
            requiredVersion: '19.2.3',
          },
          'react-native': {
            singleton: true,
            eager: true,
            requiredVersion: '0.86.2',
          },
          'expo-constants': {
            singleton: true,
            eager: true,
            requiredVersion: '~57.0.8',
          },
          'expo-asset': {
            singleton: true,
            eager: true,
            requiredVersion: '~57.0.8',
          },
          'expo-font': {
            singleton: true,
            eager: true,
            requiredVersion: '~57.0.1',
          },
        },
      }),
    ],
  };
};
