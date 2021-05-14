/* globals __webpack_public_path__, __webpack_get_script_filename__ */

export const Chunk = {
  fromDevServer(chunkId: string) {
    return `${__webpack_public_path__}${__webpack_get_script_filename__(
      chunkId
    )}`;
  },
  fromFileSystem(chunkId: string) {
    return `file://${chunkId}`;
  },
  fromRemote(url: string, options: { excludeExtension?: boolean } = {}) {
    if (options.excludeExtension) {
      return url;
    }

    return __webpack_get_script_filename__(url);
  },
};
