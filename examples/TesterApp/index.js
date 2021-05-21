import { AppRegistry } from 'react-native';
import { ChunkManager, Chunk } from '../../client';
import App from './src/App';
import { name as appName } from './app.json';

ChunkManager.configure({
  storage: AsyncStorage,
  chunkResolver: async (chunkId) => {
    if (__DEV__) {
      return Chunk.fromDevServer(chunkId);
    }

    if (chunkId === 'remote') {
      return Chunk.fromRemote(`http://localhost:8080/remote_js`);
    }

    // or: Chunk.fromFileSystem(chunkId)
    return Chunk.fromRemote(`http://localhost:9999/chunks/${chunkId}`);
  }
});

AppRegistry.registerComponent(appName, () => App);
