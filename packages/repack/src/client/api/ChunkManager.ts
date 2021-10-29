// @ts-ignore
import { NativeModules } from 'react-native';
import { ChunkManagerBackend } from './ChunkManagerBackend';
import { ChunkManagerConfig } from './types';

/**
 * A manager to ease resolving, downloading and executing additional code from async chunks or
 * any arbitrary JavaScript files.
 *
 * - In development mode, all chunks will be resolved and downloaded from the Development server.
 * - In production mode, local chunks will be resolved and loaded from filesystem and remote
 * chunks will be resolved and downloaded based on the `resolveRemoteChunk` function.
 * - You can force all resolution, regardless of the mode, to go through `resolveRemoteChunk`
 * function by setting `forceRemoteChunkResolution: true` in `ChunkManager.configure(...)`.
 *
 * This API is only useful if you are working with any form of Code Splitting.
 *
 * Example of using this API with async chunks:
 * ```js
 * import * as React from 'react';
 * import { ChunkManager } from '@callstack/repack/client';
 *
 * ChunkManager.configure({
 *   resolveRemoteChunk: async (chunkId) => {
 *     return {
 *       url: `http://domain.exaple/apps/${chunkId}`,
 *     };
 *   },
 * });
 *
 * // ChunkManager.loadChunk is called internally when running `import()`
 * const TeacherModule = React.lazy(() => import('./Teacher.js'));
 * const StudentModule = React.lazy(() => import('./Student.js'));
 *
 * export function App({ role }) {
 *   if (role === 'teacher') {
 *     return <TeacherModule />;
 *   }
 *
 *   return <StudentModule />
 * }
 * ```
 */
export class ChunkManager {
  /**
   * A instance of `ChunkManagerBackend`.
   * Should not be used directly.
   *
   * @internal
   */
  private static backend = new ChunkManagerBackend(NativeModules.ChunkManager);

  /**
   * Configures `ChunkManager` to be able to resolve location of additional
   * chunks (or arbitrary code) in production.
   * Optionally, it also allows to set up caching to avoid over-fetching of chunks.
   *
   * @param config Configuration options.
   */
  static configure(config: ChunkManagerConfig) {
    ChunkManager.backend.configure(config);
  }

  /**
   * Resolves a URL to a given chunks and  whether to download a chunk
   * or reuse previously downloaded one.
   *
   * @param chunkId Id of the chunk.
   * @returns Promise with chunk's URL as `url` and a boolean `fetch` whether to download a chunk
   * or reuse previously downloaded one.
   */
  static async resolveChunk(chunkId: string, parentChunkId?: string) {
    return ChunkManager.backend.resolveChunk(chunkId, parentChunkId);
  }

  /**
   * Resolves given chunk's location, download and execute it.
   * Once the returned Promise is resolved, the code should have been evaluated.
   *
   * The execution of the code is handled internally by threading in React Native.
   *
   * @param chunkId Id of the chunk.
   * @param parentChunkId Id of the parent chunk.
   */
  static async loadChunk(chunkId: string, parentChunkId?: string) {
    return ChunkManager.backend.loadChunk(chunkId, parentChunkId);
  }

  /**
   * Resolves given chunk's location and download it without executing.
   *
   * This function can be awaited to detect if the chunk was downloaded and for error handling.
   *
   * @param chunkId Id of the chunk.
   */
  static async preloadChunk(chunkId: string) {
    return ChunkManager.backend.preloadChunk(chunkId);
  }

  /**
   * Clears the cache (if configured in {@link ChunkManager.configure}) and removes downloaded
   * files for given chunks from the filesystem.
   *
   * This function can be awaited to detect if the chunks were invalidated and for error handling.
   *
   * @param chunksIds Array of chunk Ids to clear from cache and remove from filesystem.
   */
  static async invalidateChunks(chunksIds: string[] = []) {
    return ChunkManager.backend.invalidateChunks(chunksIds);
  }
}
