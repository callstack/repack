import type { SendProgress, Server } from '@callstack/repack-dev-server';
import type { EnvOptions } from '../types.js';

export type Bundler = 'rspack' | 'webpack';

export interface BundleArguments {
  entryFile: string;
  platform: string;
  dev: boolean;
  minify?: boolean;
  bundleOutput?: string;
  sourcemapOutput?: string;
  assetsDest?: string;
  json?: string;
  stats?: string;
  resetCache?: boolean;
  verbose?: boolean;
  watch?: boolean;
  maxWorkers?: number;
  config?: string;
  webpackConfig?: string;
  bundler?: Bundler;
}

export interface StartArguments {
  port?: number;
  host: string;
  https?: boolean;
  key?: string;
  cert?: string;
  interactive?: boolean;
  json?: boolean;
  logFile?: string;
  logRequests?: boolean;
  platform?: string;
  resetCache?: boolean;
  reversePort?: boolean;
  verbose?: boolean;
  maxWorkers?: number;
  config?: string;
  webpackConfig?: string;
  bundler?: Bundler;
}

export interface CliConfig {
  root: string;
  platforms: string[];
  reactNativePath: string;
}

export interface StartCliOptions {
  command: 'start';
  config: CliConfig;
  arguments: { start: StartArguments };
}

export interface BundleCliOptions {
  command: 'bundle';
  config: CliConfig;
  arguments: { bundle: BundleArguments };
}

export type CliOptions = StartCliOptions | BundleCliOptions;

export type RemoveRecord<T> = T extends infer U & Record<string, any>
  ? U
  : never;

type ConfigKeys =
  | 'name'
  | 'context'
  | 'mode'
  | 'devServer'
  | 'entry'
  | 'optimization'
  | 'output'
  | 'resolve';

export type ConfigurationObject = Partial<Record<ConfigKeys, any>>;

export type Configuration<T> =
  | T
  | ((env: EnvOptions, argv: Record<string, any>) => T | Promise<T>);

export interface CompilerAsset {
  data: Buffer;
  info: {
    hotModuleReplacement?: boolean;
    related?: { sourceMap?: string | string[] };
    size?: number;
    [key: string]: any;
  };
  size: number;
}

export interface CompilerInterface {
  platforms: string[];
  assetsCache: Record<string, Record<string, CompilerAsset> | undefined>;
  statsCache: Record<string, Record<string, any> | undefined>;
  setDevServerContext(ctx: Server.DelegateContext): void;
  start(): void;
  getAsset(
    filename: string,
    platform: string,
    sendProgress?: SendProgress
  ): Promise<CompilerAsset>;
  getSource(
    filename: string,
    platform: string | undefined,
    sendProgress?: SendProgress
  ): Promise<string | Buffer>;
  getSourceMap(
    filename: string,
    platform: string | undefined
  ): Promise<string | Buffer>;
}
