import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import url from 'node:url';
import {
  DEFAULT_RSPACK_CONFIG_LOCATIONS,
  DEFAULT_WEBPACK_CONFIG_LOCATIONS,
} from '../consts';

function getConfigFilePath(root: string, candidates: string[]): string {
  for (const candidate of candidates) {
    const filename = path.isAbsolute(candidate)
      ? candidate
      : path.join(root, candidate);

    if (fs.existsSync(filename)) {
      if (path.extname(filename) === '.mjs' && os.platform() === 'win32') {
        return url.pathToFileURL(filename).href;
      } else {
        return filename;
      }
    }
  }

  throw new Error('Cannot find configuration file');
}

export function getWebpackConfigFilePath(
  root: string,
  customPath?: string
): string {
  const candidates = customPath
    ? [customPath]
    : DEFAULT_WEBPACK_CONFIG_LOCATIONS;

  try {
    return getConfigFilePath(root, candidates);
  } catch {
    throw new Error('Cannot find Webpack configuration file');
  }
}

export function getRspackConfigFilePath(
  root: string,
  customPath?: string
): string {
  const candidates = customPath
    ? [customPath]
    : DEFAULT_RSPACK_CONFIG_LOCATIONS;

  try {
    return getConfigFilePath(root, candidates);
  } catch {
    throw new Error('Cannot find Rspack configuration file');
  }
}
