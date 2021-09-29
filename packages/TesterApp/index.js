import { AppRegistry } from 'react-native';
import { ChunkManager } from '@callstack/repack/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from './src/App';
import { name as appName } from './app.json';

ChunkManager.configure({
  storage: AsyncStorage,
  resolveRemoteChunk: async (chunkId) => {
    return {
      url: `http://localhost:5000/${chunkId}`,
    };
  },
});

AppRegistry.registerComponent(appName, () => App);
