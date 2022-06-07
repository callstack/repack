import type { SendProgress } from '../../types';

export interface CompilerDelegate {
  getAsset: (
    filename: string,
    platform: string,
    sendProgress?: SendProgress
  ) => Promise<string | Buffer>;
  getMimeType: (
    filename: string,
    platform: string,
    data: string | Buffer
  ) => string;
  inferPlatform?: (uri: string) => string | undefined;
}
