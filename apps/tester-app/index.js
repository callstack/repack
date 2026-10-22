import { withOnBootNetworkActivityRecording } from '@rozenite/network-activity-plugin';
import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';
import App from './src/App';

// ScriptManager setup
import './src/setup';

withOnBootNetworkActivityRecording();

AppRegistry.registerComponent(appName, () => App);
