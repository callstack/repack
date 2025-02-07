import { AppRegistry } from 'react-native';

import { components } from '../../app.json';
import App from './HostApp';

AppRegistry.registerComponent(components[0].appKey, () => App);
