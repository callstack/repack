import mimeTypes from 'mime-types';

export function getMimeType(filename: string) {
  if (filename.endsWith('.bundle')) {
    return 'text/javascript';
  }

  if (filename.endsWith('.map')) {
    return 'application/json';
  }

  return mimeTypes.lookup(filename) || 'text/plain';
}
