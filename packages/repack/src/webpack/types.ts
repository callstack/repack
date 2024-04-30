import type rspack from '@rspack/core';

type RemoveRecord<T> = T extends infer U & Record<string, any> ? U : never;

type JsStatsAsset = RemoveRecord<rspack.StatsAsset>;

export interface CompilerAsset {
  data: Buffer;
  info: JsStatsAsset['info'];
  size: number;
}

export type MultiWatching = ReturnType<rspack.MultiCompiler['watch']>;
