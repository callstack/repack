import path from 'path';

/** {@link getChunkFilename} options. */
export interface GetChunkFilenameOptions {
  /** Target application platform. */
  platform: string;
  /** Bundle output filename - name under which built bundle will be saved. */
  outputFilename: string;
  /** Chunk basename template. Defaults to `[name].chunk.bundle`. */
  template?: string;
}

/**
 * Get Webpack's chunk filename.
 *
 * @param options Options object.
 * @returns Value for Webpack's `output.chunkFilename` option.
 *
 * @category Webpack util
 */
export function getChunkFilename(options: GetChunkFilenameOptions) {
  const {
    platform,
    outputFilename,
    template = '[name].chunk.bundle',
  } = options;

  if (platform === 'ios') {
    return template;
  }

  return path.join(path.dirname(outputFilename), template);
}
