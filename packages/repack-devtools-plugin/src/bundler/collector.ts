import { LIMITS } from '../shared/constants.js';
import type { CompilationIssue } from '../shared/types.js';
import {
  type DevServerStore,
  getCompilation,
  getDevServerStore,
} from './store.js';

type Tap<TArgs extends unknown[]> = {
  tap(name: string, callback: (...args: TArgs) => void): void;
};

type StatsJson = {
  hash?: string;
  time?: number;
  errors?: RawIssue[];
  warnings?: RawIssue[];
  errorsCount?: number;
  warningsCount?: number;
  assets?: Array<{
    name: string;
    size: number;
    chunkNames?: Array<string | number>;
  }>;
};

type RawIssue =
  | string
  | {
      message?: string;
      moduleName?: string;
      moduleIdentifier?: string;
      file?: string;
      loc?: string;
    };

type StatsLike = {
  hasErrors(): boolean;
  toJson(options: Record<string, boolean>): StatsJson;
};

export type CompilerLike = {
  modifiedFiles?: ReadonlySet<string>;
  removedFiles?: ReadonlySet<string>;
  hooks: {
    watchRun: Tap<[CompilerLike]>;
    invalid: Tap<[string | null | undefined, ...unknown[]]>;
    done: Tap<[StatsLike]>;
  };
};

const MAX_ASSETS = 500;
const MAX_FILES = 100;

const stripAnsi = (value: string) => value.replace(/\u001b\[[0-9;]*m/g, '');

export const toIssue = (raw: RawIssue): CompilationIssue => {
  if (typeof raw === 'string') {
    return { message: stripAnsi(raw).slice(0, LIMITS.messageLength) };
  }
  return {
    message: stripAnsi(raw.message ?? '').slice(0, LIMITS.messageLength),
    moduleName: raw.moduleName,
    file: raw.file,
    loc: raw.loc,
  };
};

const listFiles = (files?: ReadonlySet<string>) =>
  files ? Array.from(files).slice(0, MAX_FILES) : [];

export const recordBuildStart = (
  store: DevServerStore,
  platform: string,
  compiler?: Pick<CompilerLike, 'modifiedFiles' | 'removedFiles'>,
  now = Date.now()
) => {
  const compilation = getCompilation(store, platform);
  compilation.status = 'compiling';
  compilation.startedAt = now;
  compilation.changedFiles = listFiles(compiler?.modifiedFiles);
  compilation.removedFiles = listFiles(compiler?.removedFiles);
};

export const recordBuildDone = (
  store: DevServerStore,
  platform: string,
  stats: StatsLike,
  now = Date.now()
) => {
  const compilation = getCompilation(store, platform);
  const json = stats.toJson({
    all: false,
    hash: true,
    timings: true,
    errors: true,
    warnings: true,
    errorsCount: true,
    warningsCount: true,
    assets: true,
  });
  const errors = json.errors ?? [];
  const warnings = json.warnings ?? [];
  compilation.builds += 1;
  compilation.status = stats.hasErrors() ? 'failed' : 'ok';
  compilation.finishedAt = now;
  compilation.durationMs =
    json.time ??
    (compilation.startedAt !== undefined
      ? now - compilation.startedAt
      : undefined);
  compilation.hash = json.hash;
  compilation.errorCount = json.errorsCount ?? errors.length;
  compilation.warningCount = json.warningsCount ?? warnings.length;
  compilation.errors = errors.slice(0, LIMITS.compilationIssues).map(toIssue);
  compilation.warnings = warnings
    .slice(0, LIMITS.compilationIssues)
    .map(toIssue);
  compilation.assets = (json.assets ?? [])
    .slice(0, MAX_ASSETS)
    .map(({ name, size, chunkNames }) => ({ name, size, chunkNames }));
};

/**
 * Records compilation status, issues, emitted assets and the files behind
 * each rebuild for one platform compiler.
 */
export class RepackDevToolsCollectorPlugin {
  constructor(private readonly options: { platform: string }) {}

  apply(compiler: CompilerLike) {
    const name = 'RepackDevToolsCollectorPlugin';
    const { platform } = this.options;
    compiler.hooks.watchRun.tap(name, (watching) => {
      recordBuildStart(getDevServerStore(), platform, watching);
    });
    compiler.hooks.invalid.tap(name, () => {
      getCompilation(getDevServerStore(), platform).status = 'compiling';
    });
    compiler.hooks.done.tap(name, (stats) => {
      try {
        recordBuildDone(getDevServerStore(), platform, stats);
      } catch {
        // never fail the build because of devtools
      }
    });
  }
}
