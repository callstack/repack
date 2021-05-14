// @ts-ignore
import { NativeModules } from 'react-native';
import { sha256 } from 'hash.js';

type ChunkResolver = (chunkId: string) => Promise<string>;

class ChunkManager {
  resolveCache: Record<string, string> = {};
  private resolver?: ChunkResolver;

  configureResolver(fn: ChunkResolver) {
    this.resolver = fn;
  }

  private getChunkHash(url: string) {
    return sha256().update(url).digest('hex').substr(0, 32);
  }

  async resolveChunk(chunkId: string) {
    if (!this.resolver) {
      throw new Error('No chunk resolver was configured');
    }

    if (!this.resolveCache[chunkId]) {
      const location = await this.resolver(chunkId);
      this.resolveCache[chunkId] = location;
    }

    return this.resolveCache[chunkId];
  }

  async loadChunk(chunkId: string) {
    try {
      const url = await this.resolveChunk(chunkId);
      const chunkHash = this.getChunkHash(url);
      await NativeModules.ChunkManager.loadChunk(chunkHash, chunkId, url);
    } catch (error) {
      console.error(
        'ChunkManager.loadChunk invocation failed:',
        error.message,
        error.code ? `[${error.code}]` : ''
      );
      throw error;
    }
  }

  async preloadChunk(chunkId: string) {
    try {
      const url = await this.resolveChunk(chunkId);
      const chunkHash = this.getChunkHash(url);
      await NativeModules.ChunkManager.preloadChunk(chunkHash, chunkId, url);
    } catch (error) {
      console.error(
        'ChunkManager.preloadChunk invocation failed:',
        error.message,
        error.code ? `[${error.code}]` : ''
      );
      throw error;
    }
  }

  async invalidateChunk(chunkId: string) {
    try {
      const url = await this.resolveChunk(chunkId);
      const chunkHash = this.getChunkHash(url);
      delete this.resolveCache[chunkId];
      await NativeModules.ChunkManager.invalidateChunk(chunkHash, chunkId, url);
    } catch (error) {
      console.error(
        'ChunkManager.preloadChunk invocation failed:',
        error.message,
        error.code ? `[${error.code}]` : ''
      );
      throw error;
    }
  }
}

const ChunkManagerInstance = new ChunkManager();
export { ChunkManagerInstance as ChunkManager };
