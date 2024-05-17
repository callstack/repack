import type { LoaderContext } from '@rspack/core';
import type { AssetLoaderOptions } from './options';

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
  [key: string]: string;
}

export interface CollectOptions {
  name: string;
  platform: string;
  type: string;
}

export interface AssetLoaderContext extends LoaderContext<AssetLoaderOptions> {}
