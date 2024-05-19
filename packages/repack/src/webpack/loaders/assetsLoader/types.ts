import type { LoaderContext } from '@rspack/core';
import type { AssetLoaderOptions } from './options';

export interface Asset {
  data: Buffer;
  default: boolean;
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

export interface AssetLoaderContext extends LoaderContext<AssetLoaderOptions> {}
