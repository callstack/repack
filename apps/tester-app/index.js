import { installRepackDevTools } from '@callstack/repack-devtools-plugin';
import { withOnBootNetworkActivityRecording } from '@rozenite/network-activity-plugin';
import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';
import App from './src/App';

// ScriptManager setup
import './src/setup';

installRepackDevTools({ boot: true });
withOnBootNetworkActivityRecording();

AppRegistry.registerComponent(appName, () => App);
