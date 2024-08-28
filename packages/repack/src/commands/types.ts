import type { MultiCompiler, StatsAsset } from '@rspack/core';

type RemoveRecord<T> = T extends infer U & Record<string, any> ? U : never;

type JsStatsAsset = RemoveRecord<StatsAsset> & {
  info: { hotModuleReplacement: boolean };
};
export interface CompilerAsset {
  data: Buffer;
  info: JsStatsAsset['info'];
  size: number;
}

export type MultiWatching = ReturnType<MultiCompiler['watch']>;
