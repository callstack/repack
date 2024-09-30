import os from 'node:os';

const isWindows = os.platform() === 'win32';

export const adaptFilenameToPlatform = (filename: string) => {
  if (isWindows) {
    return filename.replace(/\\/g, '/');
  }
  return filename;
};
