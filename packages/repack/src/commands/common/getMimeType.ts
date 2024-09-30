import mimeTypes from 'mime-types';

/**
 * Get the MIME type for a given filename.
 *
 * Note: The `mime-types` library currently uses 'application/javascript' for JavaScript files,
 * but 'text/javascript' is more widely recognized and standard.
 *
 * @param {string} filename - The name of the file to get the MIME type for.
 * @returns {string} - The MIME type of the file.
 */
export function getMimeType(filename: string) {
  if (filename.endsWith('.bundle')) {
    return 'application/javascript';
  }

  if (filename.endsWith('.map')) {
    return 'application/json';
  }

  return mimeTypes.lookup(filename) || 'text/plain';
}
