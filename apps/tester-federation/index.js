import { AppRegistry } from 'react-native';

import App from './src/host/App';
import { components } from './app.json';

AppRegistry.registerComponent(components[0].appKey, () => App);
