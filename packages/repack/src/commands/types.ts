import type { SendProgress, Server } from '@callstack/repack-dev-server';
import type { EnvOptions } from '../types.js';

export type Bundler = 'rspack' | 'webpack';

export interface BundleArguments {
  entryFile?: string;
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
  /** Runtime-only standalone mode; reaches configs via `env.argv`. */
  standalone?: boolean;
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
  /** Runtime-only standalone mode; reaches configs via `env.argv`. */
  standalone?: boolean;
}

export interface FederationManifestArguments {
  source?: string;
  json?: boolean;
}

export interface FederationDoctorArguments {
  host?: string;
  /** Comma-separated string; an array appears if the CLI merges repeated flags. */
  remotes?: string | string[];
  format?: string;
  allowMissingManifests?: boolean;
  /** Also compare every remote pair, shared-dependency checks only. */
  pairwise?: boolean;
  /** Pre-build mode over package.json + bundler configs; never reads manifests. */
  dryRun?: boolean;
}

export interface FederationDevArguments {
  /** Comma-separated remote names; absent means every declared remote. */
  apps?: string | string[];
  /** App platform for child compile scope and run guidance; validated by the command. */
  platform?: string;
  /**
   * --launch / --no-launch: true launches the app on first readiness,
   * false never, absent defers to the wizard (TTY) or means no (CI).
   */
  launch?: boolean;
  /** Device id forwarded verbatim to run-<platform>. */
  device?: string;
  /** Host dev-server port; parsed Number, range-checked by the command. */
  port?: number;
  /** Reassign busy declared ports instead of failing with a conflict. */
  autoPorts?: boolean;
  /** Remote to launch in standalone mode, gated by the file declaration. */
  standalone?: string;
  /** False with --no-interactive: suppresses the interactive wizard. */
  interactive?: boolean;
  /** Machine-readable plan/status documents on stdout. */
  json?: boolean;
  /** Print the plan and spawn nothing. */
  dryRun?: boolean;
  /** Specific repack-federation.json to run; overrides the walk-up default. */
  config?: string;
}

export interface FederationInitArguments {
  /** Name of the remote to scaffold. */
  name?: string;
  /** Pre-approve all diffs and auto-align divergent remote pins to the host. */
  yes?: boolean;
  /** Record standalone support for the new remote (refused for unsupported targets). */
  standalone?: boolean;
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
  | 'resolve'
  | 'experiments'
  | 'cache'
  | 'watchOptions'
  | 'stats'
  | 'plugins';

/**
 * Loose configuration shape used as a generic constraint for `makeCompilerConfig`.
 * Values are intentionally `any` — both webpack and rspack `Configuration` types
 * must satisfy `C extends ConfigurationObject` in generic helper functions that
 * assign to `Partial<C>` properties (e.g. `getCliOverrides`, `normalizeConfig`).
 * Using `unknown` values would break these generic assignments.
 */
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
    [key: string]: unknown;
  };
  size: number;
}

export interface CompilerInterface {
  platforms: string[];
  assetsCache: Record<string, Record<string, CompilerAsset> | undefined>;
  statsCache: Record<string, unknown>;
  setDevServerContext(ctx: Server.DelegateContext): void;
  start(): void;
  close(callback?: (error?: Error | null) => void): void;
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
