export interface Asset {
  filename: string;
  content: string | Buffer | undefined;
  scaleKey: string;
  scale: number;
}

export interface URISource {
  uri: string;
  width?: number;
  height?: number;
  scale?: number;
}

export interface ImageSize {
  width?: number;
  height?: number;
}

export interface CollectedScales {
  [key: string]: {
    platform: string;
    name: string;
  };
}

export interface CollectOptions {
  name: string;
  platform: string;
  type: string;
}
