import { AppRegistry, Platform } from 'react-native';
import { ScriptManager, Federated } from '@callstack/repack/client';
import { init, loadShareSync } from '@module-federation/runtime';

import App from './src/host/App';
import { components } from './app.json';

init({
  shared: {
    react: {
      singleton: true,
      eager: true,
      version: '18.2.0',
      lib: () => require('react'),
    },
    // needs to be shared in development
    'react/jsx-dev-runtime': {
      singleton: true,
      eager: true,
      version: '18.2.0',
      lib: () => require('react/jsx-dev-runtime'),
    },
    'react-native': {
      singleton: true,
      eager: true,
      version: '0.74.3',
      lib: () => require('react-native'),
    },
    // required through RePack modules (WebpackHMRClient, configurePublicPath)
    'react-native/Libraries/Core/Devtools/getDevServer': {
      singleton: true,
      eager: true,
      version: '0.74.3',
      lib: () => require('react-native/Libraries/Core/Devtools/getDevServer'),
    },
    'react-native/Libraries/Utilities/DevSettings': {
      singleton: true,
      eager: true,
      version: '0.74.3',
      lib: () => require('react-native/Libraries/Utilities/DevSettings'),
    },
    'react-native/Libraries/Utilities/LoadingView': {
      singleton: true,
      eager: true,
      version: '0.74.3',
      lib: () => require('react-native/Libraries/Utilities/LoadingView'),
    },
    'react-native/Libraries/Utilities/Platform': {
      singleton: true,
      eager: true,
      version: '0.74.3',
      lib: () => require('react-native/Libraries/Utilities/Platform'),
    },
    'react-native/Libraries/LogBox/Data/LogBoxData': {
      singleton: true,
      eager: true,
      version: '0.74.3',
      lib: () => require('react-native/Libraries/LogBox/Data/LogBoxData'),
    },
    'react-native/Libraries/NativeModules/specs/NativeRedBox': {
      singleton: true,
      eager: true,
      version: '0.74.3',
      lib: () =>
        require('react-native/Libraries/NativeModules/specs/NativeRedBox'),
    },
    'react-native/Libraries/Core/NativeExceptionsManager': {
      singleton: true,
      eager: true,
      version: '0.74.3',
      lib: () => require('react-native/Libraries/Core/NativeExceptionsManager'),
    },
    // Assets registry
    'react-native/Libraries/Image/AssetRegistry': {
      singleton: true,
      eager: true,
      version: '0.74.3',
      lib: () => require('react-native/Libraries/Image/AssetRegistry'),
    },
  },
});

loadShareSync('react');
loadShareSync('react/jsx-dev-runtime');
loadShareSync('react-native');
loadShareSync('react-native/Libraries/Image/AssetRegistry');

const resolveURL = Federated.createURLResolver({
  containers: { MiniApp: 'http://localhost:8082/[name][ext]' },
});

ScriptManager.shared.addResolver(async (scriptId, caller) => {
  return {
    url: resolveURL(scriptId, caller),
    query: { platform: Platform.OS },
  };
});

AppRegistry.registerComponent(components[0].appKey, () => App);
