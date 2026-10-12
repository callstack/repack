import fs from 'node:fs';
import path from 'node:path';
import type {
  Chunk,
  Compilation,
  Module,
  Compiler as RspackCompiler,
} from '@rspack/core';
import type { Compiler as WebpackCompiler } from 'webpack';

const WORKLETS_PACKAGE = 'react-native-worklets';
const GENERATED_DIR = '.worklets';
const PLUGIN_NAME = 'RepackWorkletsBundleModePlugin';
const POLYFILL_RELATIVE_PATH = path.join(
  'bundleMode',
  'polyfills',
  'prepareBundleMode.js'
);

/**
 * The module id native asks `__r` for in order to boot Worklets, reserved by
 * `react-native-worklets` for its own entry point.
 */
const WORKLETS_ENTRY_MODULE_ID = -2;

/**
 * Files Bundle Mode treats as the Worklets entry point, which native requires
 * through the reserved module id `-2`. `src/index.ts` is what bundlers pick when
 * the `react-native` field wins, `lib/module/index.js` otherwise.
 *
 * Ordered by preference: the first file that exists is the one the `worklets-entry`
 * alias points at, and it is the one that wins the reserved id when a config puts
 * more than one of these files in the same chunk.
 */
const WORKLETS_ENTRY_PATHS = [
  path.join('src', 'index.ts'),
  path.join('lib', 'module', 'index.js'),
];

const GENERATED_MODULE_RE = new RegExp(
  `[/\\\\]${GENERATED_DIR}[/\\\\](\\d+)\\.[cm]?[jt]sx?$`
);
const WORKLETS_BABEL_PLUGIN_RE =
  /(react-native-worklets[/\\]plugin|babel-plugin-worklets)/;

const WORKLETS_CACHE_GROUP = 'repackWorkletsBundleMode';
// Above every default `splitChunks.cacheGroups` priority, so Worklets wins over the
// built-in `vendors`/`default` groups.
const WORKLETS_CACHE_GROUP_PRIORITY = 100000;

interface WorkletsBabelPluginItem {
  name?: string;
  file?: { request?: string };
  options?: { bundleMode?: boolean };
}

export interface WorkletsBundleModePluginOptions {
  /**
   * The project root, used to resolve `react-native-worklets`.
   * Defaults to `process.cwd()`.
   */
  context?: string;
}

function toPosixPath(value: string) {
  return value.split(path.sep).join('/');
}

function getModuleResource(module: Module) {
  return (module as { resource?: unknown }).resource;
}

function workletsModuleTest(module: Module) {
  const resource = getModuleResource(module);
  return (
    typeof resource === 'string' &&
    toPosixPath(resource).includes(`/${WORKLETS_PACKAGE}/`)
  );
}

/**
 * Reads the project's Babel config and reports whether the Worklets Babel plugin
 * is configured with `bundleMode: true`, which is the source of truth for
 * Bundle Mode.
 */
export function detectWorkletsBundleMode(context: string): boolean {
  const babel = require('@babel/core') as typeof import('@babel/core');
  try {
    // `loadPartialConfig` is used instead of `loadOptions`, because only the former
    // keeps the request the plugin was configured with. Once Babel has resolved the
    // config, the Worklets plugin is only identified by the name it returns
    // ('worklets'), which says nothing about where it came from.
    const config = babel.loadPartialConfig({
      caller: { name: '@callstack/repack' },
      filename: path.join(context, 'index.js'),
      root: context,
      envName: process.env.BABEL_ENV || process.env.NODE_ENV || 'development',
    });
    const plugins = (config?.options?.plugins ??
      []) as WorkletsBabelPluginItem[];
    return plugins.some((plugin) => {
      const request = [plugin?.name, plugin?.file?.request]
        .filter((value): value is string => typeof value === 'string')
        .join(' ');
      return (
        WORKLETS_BABEL_PLUGIN_RE.test(request) &&
        plugin?.options?.bundleMode === true
      );
    });
  } catch {
    return false;
  }
}

export function resolveWorkletsRoot(context: string): string | undefined {
  try {
    const packageJsonPath = require.resolve(
      `${WORKLETS_PACKAGE}/package.json`,
      {
        paths: [context],
      }
    );
    return path.dirname(packageJsonPath);
  } catch {
    return undefined;
  }
}

/**
 * The variant of the Worklets entry point the `worklets-entry` alias points at: the
 * first existing file of `WORKLETS_ENTRY_PATHS`. The source file wins when the package
 * ships it, otherwise the compiled file keeps the alias from pointing at a path that
 * does not exist. Both this and `selectWorkletsEntry` read the same order, so the
 * module the alias requests is also the module that owns the reserved id.
 */
function resolveWorkletsEntryRelativePath(workletsRoot: string) {
  return (
    WORKLETS_ENTRY_PATHS.find((entryPath) =>
      fs.existsSync(path.join(workletsRoot, entryPath))
    ) ?? WORKLETS_ENTRY_PATHS[0]
  );
}

/**
 * Position of a resource in `WORKLETS_ENTRY_PATHS`, lower being closer to the file the
 * `worklets-entry` alias points at. Returns `undefined` for every other module.
 */
function getWorkletsEntryRank(resource: string, workletsRoot: string) {
  if (!path.isAbsolute(resource)) {
    return undefined;
  }
  const relative = toPosixPath(path.relative(workletsRoot, resource));
  const rank = WORKLETS_ENTRY_PATHS.findIndex(
    (entryPath) => relative === toPosixPath(entryPath)
  );
  return rank === -1 ? undefined : rank;
}

interface WorkletsEntryCandidate {
  module: Module;
  resource: string;
  rank: number;
}

/**
 * Every module in `modules` that could claim the reserved entry point id, tagged with
 * its position in `WORKLETS_ENTRY_PATHS`.
 */
function collectWorkletsEntryCandidates(
  modules: Iterable<Module>,
  workletsRoot: string
): WorkletsEntryCandidate[] {
  const candidates: WorkletsEntryCandidate[] = [];
  for (const module of modules) {
    const resource = getModuleResource(module);
    if (typeof resource !== 'string') {
      continue;
    }
    const rank = getWorkletsEntryRank(resource, workletsRoot);
    if (rank !== undefined) {
      candidates.push({
        module,
        resource: toPosixPath(path.normalize(resource)),
        rank,
      });
    }
  }
  return candidates;
}

/**
 * Picks the module owning the reserved id `-2` out of `candidates`.
 *
 * More than one of `WORKLETS_ENTRY_PATHS` can reach the same chunk: the alias always
 * requests one of them, while the app's own `react-native-worklets` imports resolve
 * to whichever file its resolve conditions prefer, and those two do not always agree.
 * Both would write the same key, leaving the id map at the mercy of the order the
 * chunk stores modules in, so the variant closest to the aliased file always wins and
 * the rest come back as collisions for the caller to report.
 */
function selectWorkletsEntry(candidates: WorkletsEntryCandidate[]) {
  // Ranked first, path as a locale-independent tie-break, so neither the winner nor
  // the reported collisions depend on the order the chunk stores its modules in.
  const sorted = [...candidates].sort((a, b) => {
    if (a.rank !== b.rank) {
      return a.rank - b.rank;
    }
    if (a.resource === b.resource) {
      return 0;
    }
    return a.resource < b.resource ? -1 : 1;
  });
  const [winner, ...collisions] = sorted;
  return { winner, collisions };
}

/**
 * Maps a module resource to the id Worklets expects `__r` to be called with:
 * `-2` for the Worklets entry point, or the worklet hash for a generated worklet.
 * Returns `undefined` for every other module.
 */
function getWorkletsModuleId(resource: string, workletsRoot: string) {
  const generated = GENERATED_MODULE_RE.exec(resource);
  if (generated && toPosixPath(resource).includes(`/${WORKLETS_PACKAGE}/`)) {
    return Number(generated[1]);
  }
  if (getWorkletsEntryRank(resource, workletsRoot) !== undefined) {
    return WORKLETS_ENTRY_MODULE_ID;
  }
  return undefined;
}

export class WorkletsBundleModePlugin {
  private entryChunkNames = new Set<string>();
  private workletsRoot: string | undefined;

  constructor(private options: WorkletsBundleModePluginOptions = {}) {
    this.workletsRoot = resolveWorkletsRoot(options.context ?? process.cwd());
  }

  apply(compiler: RspackCompiler): void;
  apply(compiler: WebpackCompiler): void;

  apply(__compiler: unknown) {
    const compiler = __compiler as RspackCompiler;
    const workletsRoot = this.workletsRoot;

    if (!workletsRoot) {
      console.warn(
        `[${PLUGIN_NAME}] '${WORKLETS_PACKAGE}' was not found in the project, ` +
          'skipping Worklets Bundle Mode setup.'
      );
      return;
    }

    // The Worklets Babel plugin rewrites every worklet into an import from
    // `react-native-worklets/.worklets/<hash>.js`. Those files are generated while
    // the code is being transformed, so the location is aliased here instead of
    // relying on the bundler discovering the generated directory. The two extra
    // aliases let `bundleModeInclude.js` reach the Worklets entry point and the
    // Bundle Mode polyfill from inside this package.
    compiler.options.resolve.alias = {
      [`${WORKLETS_PACKAGE}/${GENERATED_DIR}`]: path.join(
        workletsRoot,
        GENERATED_DIR
      ),
      '@callstack/repack-plugin-reanimated/worklets-entry': path.resolve(
        path.join(workletsRoot, resolveWorkletsEntryRelativePath(workletsRoot))
      ),
      '@callstack/repack-plugin-reanimated/worklets-polyfill': path.resolve(
        path.join(workletsRoot, POLYFILL_RELATIVE_PATH)
      ),
      ...compiler.options.resolve.alias,
    };

    const includeModulesPath = require.resolve('./bundleModeInclude.js');

    compiler.hooks.entryOption.tap(
      {
        name: PLUGIN_NAME,
        before: 'RepackNativeEntryPlugin',
        stage: -100,
      },
      (_, entry) => {
        if (typeof entry === 'function') {
          throw new Error(
            `[${PLUGIN_NAME}] Dynamic entry (function) is not supported.`
          );
        }

        for (const entryName of Object.keys(entry)) {
          const entryChunkName = entry[entryName].runtime || entryName;
          this.entryChunkNames.add(entryChunkName);
          // Pulls the Worklets entry point and the Bundle Mode polyfill into the
          // graph without executing either of them on the RN Runtime.
          new compiler.webpack.EntryPlugin(
            compiler.context,
            includeModulesPath,
            {
              name: entryChunkName,
            }
          ).apply(compiler);
        }

        this.addWorkletsCacheGroup(compiler);
      }
    );

    const WorkletsBundleModeRuntimeModule = makeRuntimeModule(
      compiler,
      workletsRoot
    );

    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
      compilation.hooks.additionalTreeRuntimeRequirements.tap(
        PLUGIN_NAME,
        (chunk, runtimeRequirements) => {
          if (!this.isEntryChunk(chunk)) {
            return;
          }
          const RuntimeGlobals = compiler.webpack.RuntimeGlobals as Record<
            string,
            string
          >;
          runtimeRequirements.add(RuntimeGlobals.require);
          if (RuntimeGlobals.startup) {
            runtimeRequirements.add(RuntimeGlobals.startup);
          }
          compilation.addRuntimeModule(
            chunk,
            new WorkletsBundleModeRuntimeModule(chunk)
          );
        }
      );

      compilation.hooks.processAssets.tap(
        {
          name: PLUGIN_NAME,
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ANALYSE,
        },
        () => this.warnAboutWorkletsOutsideMainChunk(compilation)
      );
    });
  }

  private isEntryChunk(chunk: Chunk) {
    return (
      this.entryChunkNames.size === 0 ||
      (chunk.name !== undefined && this.entryChunkNames.has(chunk.name)) ||
      this.entryChunkNames.has(String(chunk.id))
    );
  }

  /**
   * Worklet Runtimes only evaluate the entry chunk, so every Worklets module has to
   * stay in it: the runtime module requires the entry point by the reserved id `-2`,
   * and code splitting would move it, or any worklet reachable only through a
   * dynamic import, into a chunk those runtimes never load.
   */
  private addWorkletsCacheGroup(compiler: RspackCompiler) {
    if (!compiler.options.optimization) {
      compiler.options.optimization = {};
    }
    const optimization = compiler.options.optimization as Record<string, any>;
    // Nothing to protect when code splitting is off.
    if (optimization.splitChunks === false) {
      return;
    }
    if (!optimization.splitChunks) {
      optimization.splitChunks = {};
    }
    const splitChunks = optimization.splitChunks as Record<string, any>;
    if (!splitChunks.cacheGroups) {
      splitChunks.cacheGroups = {};
    }
    const cacheGroups = splitChunks.cacheGroups as Record<string, any>;
    if (cacheGroups[WORKLETS_CACHE_GROUP]) {
      return;
    }
    const [entryChunkName] = this.entryChunkNames;
    cacheGroups[WORKLETS_CACHE_GROUP] = {
      test: workletsModuleTest,
      name: entryChunkName ?? 'main',
      chunks: () => true,
      priority: WORKLETS_CACHE_GROUP_PRIORITY,
      enforce: true,
    };
  }

  /**
   * Worklet Runtimes only ever evaluate the main bundle, so a worklet placed in a
   * split chunk stays invisible to them.
   */
  private warnAboutWorkletsOutsideMainChunk(compilation: Compilation) {
    const workletsRoot = this.workletsRoot;
    if (!workletsRoot) {
      return;
    }

    const entryModules = new Set<Module>();
    for (const chunk of compilation.chunks) {
      if (!this.isEntryChunk(chunk)) {
        continue;
      }
      for (const module of compilation.chunkGraph.getChunkModules(chunk)) {
        entryModules.add(module);
      }
      // Two variants of the Worklets entry point in the same chunk would compete for
      // the reserved id `-2`; `generate()` resolves it the same way, so only the
      // loser is worth reporting.
      const { collisions } = selectWorkletsEntry(
        collectWorkletsEntryCandidates(
          compilation.chunkGraph.getChunkModules(chunk),
          workletsRoot
        )
      );
      if (collisions.length > 0) {
        (compilation.warnings as unknown as Error[]).push(
          new Error(
            `[${PLUGIN_NAME}] ${collisions.length} module(s) claim the Worklets entry ` +
              `point id ${WORKLETS_ENTRY_MODULE_ID} in chunk '${chunk.name ?? chunk.id}' ` +
              `(${collisions.map(({ resource }) => resource).join(', ')}). ` +
              'Native requires that id to boot Worklets, so it goes to the module the ' +
              '"worklets-entry" alias points at; the ones listed above stay ' +
              'unreachable through it. Make the resolve conditions pick the same ' +
              'Worklets entry file the alias uses, and deduplicate Worklets if it ' +
              'reaches the entry chunk through a second copy of the package.'
          )
        );
      }
    }

    const deferredHashes: number[] = [];

    for (const module of compilation.modules) {
      const resource = getModuleResource(module);
      if (typeof resource !== 'string' || entryModules.has(module)) {
        continue;
      }
      const workletsModuleId = getWorkletsModuleId(resource, workletsRoot);
      if (
        workletsModuleId !== undefined &&
        workletsModuleId !== WORKLETS_ENTRY_MODULE_ID
      ) {
        deferredHashes.push(workletsModuleId);
      }
    }

    if (deferredHashes.length > 0) {
      const preview = deferredHashes.slice(0, 10).join(', ');
      (compilation.warnings as unknown as Error[]).push(
        new Error(
          `[${PLUGIN_NAME}] ${deferredHashes.length} worklet module(s) ended up outside the main ` +
            `chunk (hashes: ${preview}${deferredHashes.length > 10 ? ', ...' : ''}). ` +
            'Worklet Runtimes only evaluate the main bundle, so those worklets will not ' +
            'be available on the UI Runtime. Move the code defining them into the main ' +
            'chunk, for example by replacing the dynamic import that isolates it.'
        )
      );
    }
  }
}

/**
 * Runtime module class is generated dynamically based on the compiler instance
 * this way it's compatible with both webpack and rspack.
 */
function makeRuntimeModule(compiler: RspackCompiler, workletsRoot: string) {
  const { RuntimeModule, Template } = compiler.webpack;
  const RuntimeGlobals = compiler.webpack.RuntimeGlobals as Record<
    string,
    string
  >;
  const requireExpression = RuntimeGlobals.require;
  const startupExpression = RuntimeGlobals.startup ?? `${requireExpression}.x`;

  return class WorkletsBundleModeRuntimeModule extends RuntimeModule {
    constructor(chunk: Chunk) {
      super('worklets/bundleMode', RuntimeModule.STAGE_TRIGGER);
      this.chunk = chunk;
    }

    generate() {
      const polyfillPath = toPosixPath(
        path.join(workletsRoot, POLYFILL_RELATIVE_PATH)
      );
      const chunk = this.chunk!;
      const chunkGraph = this.compilation!.chunkGraph;
      const chunkModules = chunkGraph.getChunkModules(chunk);

      // Candidates for the reserved id are collected and ranked before any key is
      // written, so nothing about it depends on how the chunk happens to order its
      // modules. `warnAboutWorkletsOutsideMainChunk` reports the ones that lose.
      const { winner } = selectWorkletsEntry(
        collectWorkletsEntryCandidates(chunkModules, workletsRoot)
      );

      const workletModuleIds: Record<number, string | number | null> = {};
      let polyfillModuleId: string | number | null | undefined;

      if (winner) {
        workletModuleIds[WORKLETS_ENTRY_MODULE_ID] = chunkGraph.getModuleId(
          winner.module
        );
      }

      for (const module of chunkModules) {
        const resource = getModuleResource(module);
        if (typeof resource !== 'string') {
          continue;
        }
        if (toPosixPath(path.normalize(resource)) === polyfillPath) {
          polyfillModuleId = chunkGraph.getModuleId(module);
          continue;
        }
        const workletsModuleId = getWorkletsModuleId(resource, workletsRoot);
        if (
          workletsModuleId !== undefined &&
          workletsModuleId !== WORKLETS_ENTRY_MODULE_ID
        ) {
          workletModuleIds[workletsModuleId] = chunkGraph.getModuleId(module);
        }
      }

      if (polyfillModuleId === undefined) {
        throw new Error(
          `[${PLUGIN_NAME}] The Worklets Bundle Mode polyfill is missing from the entry chunk.`
        );
      }

      return Template.asString([
        `var __workletsModuleIds = ${JSON.stringify(workletModuleIds)};`,
        `var __isWorkletRuntime = globalThis.__RUNTIME_KIND !== undefined && globalThis.__RUNTIME_KIND !== 1;`,
        // Runs before anything else on both runtime kinds, mirroring the position
        // of this polyfill in a Metro bundle. It enables Bundle Mode and, on the
        // RN Runtime, asks native to start preparing the UI Runtime.
        `${requireExpression}(${JSON.stringify(polyfillModuleId)});`,
        `if (__isWorkletRuntime) {`,
        Template.asString([
          // Worklets requires modules by worklet hash, and by `-2` for its entry
          // point, while this bundler addresses modules with string ids.
          `globalThis.__r = function (id) {`,
          Template.asString([
            `var moduleId = __workletsModuleIds[id];`,
            `if (moduleId === undefined) {`,
            Template.asString([
              `throw new Error('[Worklets] Could not resolve module with id ' + id + ' on a Worklet Runtime.');`,
            ]),
            `}`,
            `return ${requireExpression}(moduleId);`,
          ]),
          `};`,
          // Metro defers requires inside function bodies to the call site, so a
          // Turbo Module import guarded by a runtime check is never reached on a
          // Worklet Runtime. This bundler hoists them, and React Native's legacy
          // module lookup then dies with "__fbBatchedBridgeConfig is not set".
          // Standing in for that lookup keeps Worklets' own diagnostics intact.
          `if (globalThis.nativeModuleProxy === undefined) {`,
          Template.asString([
            `globalThis.nativeModuleProxy = {`,
            Template.asString([
              `__workletsModuleProxy: globalThis.__workletsModuleProxy,`,
            ]),
            `};`,
          ]),
          `}`,
          // The app itself must not boot on a Worklet Runtime: React, the React
          // Native runtime and the app entry belong to the RN Runtime only.
          `var __originalStartup = ${startupExpression};`,
          `${startupExpression} = function () {`,
          Template.asString([`void __originalStartup;`, `return undefined;`]),
          `};`,
        ]),
        `}`,
      ]);
    }
  };
}
