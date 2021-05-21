/* globals __webpack_public_path__, __webpack_get_script_filename__ */

/**
 * Options for declaring remote chunk with {@link fromRemote}.
 */
export interface RemoteChunkOptions {
  /**
   * Whether not to add chunk's default extension by default. If your chunk has different
   * extension than `.chunk.bundle` you should set this flat to `true` and add extension to the URL.
   */
  excludeExtension?: boolean;
}

/**
 * Allows to create `Chunk` declaration, so that {@link ChunkManager} can correctly
 * resolve them.
 */
export const Chunk = {
  /**
   * Create declaration for chuck served from development server. Should only be used
   * in development.
   *
   * @param chunkId Id of the chunk.
   * @returns Chunk declaration.
   */
  fromDevServer(chunkId: string) {
    return `${__webpack_public_path__}${__webpack_get_script_filename__(
      chunkId
    )}`;
  },

  /**
   * Create declaration for chuck that lives on the filesystem and it's bundled inside the application.
   *
   * @param chunkId Id of the chunk.
   * @returns Chunk declaration.
   */
  fromFileSystem(chunkId: string) {
    return `file://${chunkId}`;
  },

  /**
   * Create declaration for chuck served from any remote location, e.g. server on the internet.
   *
   * @param url Full URL pointing to the chunk's remote location.
   * @param options Remote chunk options.
   * @returns Chunk declaration.
   */
  fromRemote(url: string, options: RemoteChunkOptions = {}) {
    if (options.excludeExtension) {
      return url;
    }

    return __webpack_get_script_filename__(url);
  },
};
