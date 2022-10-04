export interface Asset {
  filename: string;
  content: string | Buffer | undefined;
  scaleKey: string;
  scale: number;
  weight?: number;
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
