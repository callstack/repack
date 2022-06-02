export type ProgressData = { completed: number; total: number };
export type SendProgress = (data: ProgressData) => void;

export interface CompilerOptions {
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
}
