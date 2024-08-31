import { StatsCompilation } from 'webpack';
import { CliOptions } from '../types';

export interface WebpackWorkerOptions {
  cliOptions: CliOptions;
  platform: string;
}

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
