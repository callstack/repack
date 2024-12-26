import type { StatsAsset, StatsCompilation } from 'webpack';
import type { CliOptions, RemoveRecord } from '../types.js';

export interface WebpackWorkerOptions {
  cliOptions: CliOptions;
  platform: string;
}

type WebpackStatsAsset = RemoveRecord<StatsAsset>;

export interface CompilerAsset {
  data: Buffer;
  info: WebpackStatsAsset['info'];
  size: number;
}

export interface WorkerAsset {
  data: Uint8Array;
  info: WebpackStatsAsset['info'];
  size: number;
}

export namespace WorkerMessages {
  type WorkerMessageName =
    | 'watchRun'
    | 'invalid'
    | 'progress'
    | 'error'
    | 'done';

  interface BaseWorkerMessage {
    event: WorkerMessageName;
  }

  export interface WatchRunMessage extends BaseWorkerMessage {
    event: 'watchRun';
  }

  export interface InvalidMessage extends BaseWorkerMessage {
    event: 'invalid';
  }

  export interface ProgressMessage extends BaseWorkerMessage {
    event: 'progress';
    total: number;
    completed: number;
    percentage: number;
    label: string;
    message: string;
  }

  export interface ErrorMessage extends BaseWorkerMessage {
    event: 'error';
    error: Error;
  }

  export interface DoneMessage extends BaseWorkerMessage {
    event: 'done';
    assets: Record<string, WorkerAsset>;
    stats: StatsCompilation;
  }

  export type WorkerMessage =
    | WatchRunMessage
    | InvalidMessage
    | ProgressMessage
    | ErrorMessage
    | DoneMessage;
}
