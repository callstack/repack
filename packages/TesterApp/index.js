import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';
import { withBootstrap } from './src/bootstrap';

AppRegistry.registerComponent(appName, () => withBootstrap(App));
