import { AppRegistry } from 'react-native';
import { ChunkManager } from '@callstack/repack/client';
import App from './src/App';
import { name as appName } from './app.json';

ChunkManager.configure({
  resolveRemoteChunk: async (chunkId) => {
    return {
      url: `http://localhost:5000/${chunkId}`,
    };
  },
});

AppRegistry.registerComponent(appName, () => App);
