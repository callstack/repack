import { AppRegistry } from 'react-native';

import { ScriptManager } from '@callstack/repack/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { components } from './app.json';
import App from './src/host/App';

ScriptManager.shared.setStorage(AsyncStorage);

AppRegistry.registerComponent(components[0].appKey, () => App);
