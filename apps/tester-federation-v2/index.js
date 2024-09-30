import { AppRegistry } from 'react-native';

import { components } from './app.json';
import App from './src/host/App';

AppRegistry.registerComponent(components[0].appKey, () => App);
