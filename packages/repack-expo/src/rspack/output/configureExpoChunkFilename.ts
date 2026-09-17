import type { Compiler } from '@rspack/core';
import { ExpoPluginError } from '../ExpoPluginError.js';

const RSPACK_DEFAULT_CHUNK_FILENAME = '[name].js';
const EXPO_DEFAULT_CHUNK_FILENAME = '[name].chunk.bundle';
const CHUNK_VARYING_PLACEHOLDER =
  /\[(?:name|id|(?:content|chunk|full)hash(?::[^\]]+)?)\]/;

export function configureExpoChunkFilename(
  output: Compiler['options']['output']
): void {
  const chunkFilename = output.chunkFilename;

  if (
    chunkFilename === undefined ||
    chunkFilename === RSPACK_DEFAULT_CHUNK_FILENAME
  ) {
    output.chunkFilename = EXPO_DEFAULT_CHUNK_FILENAME;
    return;
  }

  if (typeof chunkFilename !== 'string') {
    throw new ExpoPluginError({
      code: 'INVALID_CHUNK_FILENAME',
      message:
        'ExpoPlugin requires output.chunkFilename to be a statically verifiable string.',
      recovery:
        'Use a flat string such as "[name].chunk.bundle" so packaged native chunks can be resolved by basename.',
    });
  }

  if (chunkFilename.includes('/') || chunkFilename.includes('\\')) {
    throw new ExpoPluginError({
      code: 'INVALID_CHUNK_FILENAME',
      message:
        'ExpoPlugin requires output.chunkFilename to be a flat filename without directories.',
      recovery:
        'Remove path segments and use a flat string such as "[name].chunk.bundle". Packaged native chunks are resolved by basename.',
    });
  }

  if (!CHUNK_VARYING_PLACEHOLDER.test(chunkFilename)) {
    throw new ExpoPluginError({
      code: 'INVALID_CHUNK_FILENAME',
      message:
        'ExpoPlugin requires output.chunkFilename to produce a unique basename for each chunk.',
      recovery:
        'Include [name], [id], [contenthash], [chunkhash], or [fullhash], for example "[name].chunk.bundle".',
    });
  }
}
