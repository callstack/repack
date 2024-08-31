import type { MultiCompiler, StatsAsset, StatsCompilation } from '@rspack/core';

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

export interface HMRMessageBody {
  name: string;
  time: number;
  hash: string;
  warnings: StatsCompilation['warnings'];
  errors: StatsCompilation['errors'];
}

export interface HMRMessage {
  action: 'building' | 'built' | 'sync';
  body: HMRMessageBody | null;
}
