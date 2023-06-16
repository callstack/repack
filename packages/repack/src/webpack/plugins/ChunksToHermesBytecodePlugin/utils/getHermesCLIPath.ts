import path from 'path';
import os from 'os';

import type { Path } from '../../../../types';

/**
 * Folder name of the Hermes compiler binary for the current OS.
 */
const getHermesOSBin = (): string => {
  switch (os.platform()) {
    case 'darwin':
      return 'osx-bin';
    case 'linux':
      return 'linux64-bin';
    case 'win32':
      return 'win64-bin';
    default:
      throw new Error(
        'OS not recognized. Please set hermesCLIPath to the path of a working Hermes compiler.'
      );
  }
};

/**
 * Determines the path to the Hermes compiler binary.
 *
 * Defaults to './node_modules/react-native/sdks/hermesc/{os}-bin/hermesc'
 */
export const getHermesCLIPath = (reactNativePath: Path): Path => {
  const osBin = getHermesOSBin();
  return path.join(reactNativePath, 'sdks/hermesc', osBin, 'hermesc');
};
