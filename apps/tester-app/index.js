import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';
import App from './src/App';
import { startDevTools } from './src/rozenite';

// ScriptManager setup
import './src/setup';

startDevTools();

AppRegistry.registerComponent(appName, () => App);
