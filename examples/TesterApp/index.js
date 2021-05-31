import { AppRegistry } from 'react-native';
import { ChunkManager } from '../../client';
import App from './src/App';
import { name as appName } from './app.json';

ChunkManager.configure({
  resolveRemoteChunk: async (chunkId) => {
    return {
      url: `http://localhost:6000/chunks/${chunkId}`,
    };
  },
});

AppRegistry.registerComponent(appName, () => App);
