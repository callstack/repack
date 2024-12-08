export interface Asset {
  data: Buffer;
  dimensions: AssetDimensions | null;
  filename: string;
  scale: number;
}

export interface URISource {
  uri: string;
  width?: number;
  height?: number;
  scale?: number;
}

export interface AssetDimensions {
  width: number;
  height: number;
}

export interface CollectedScales {
  [key: string]: string;
}

export interface CollectOptions {
  name: string;
  platform: string;
  type: string;
}
