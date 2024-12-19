import type { MultiCompiler, StatsAsset } from '@rspack/core';
import type { RemoveRecord } from '../types.js';

type RspackStatsAsset = RemoveRecord<StatsAsset>;

export interface CompilerAsset {
  data: Buffer;
  info: RspackStatsAsset['info'];
  size: number;
}

export type MultiWatching = ReturnType<MultiCompiler['watch']>;
