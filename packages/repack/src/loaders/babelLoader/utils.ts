import fs from 'node:fs';
import path from 'node:path';
import type { ParseResult, TransformOptions } from '@babel/core';
import type { RawSourceMap } from '@rspack/core';
import { importDefaultESM } from '../../helpers/index.js';
import {
  resolveReactNativeParser,
  resolveReactRuntimeTarget,
} from '../../helpers/resolveReactNativeParser.js';
import type { HermesParserOverrides } from './options.js';

interface ReactNativeParser {
  parse: (
    src: string,
    opts: {
      babel: boolean;
      flow?: HermesParserOverrides['flow'];
      reactRuntimeTarget: NonNullable<
        HermesParserOverrides['reactRuntimeTarget']
      >;
      sourceType: HermesParserOverrides['sourceType'] | null;
    }
  ) => ParseResult;
}

const FLOW_PRAGMA_REGEX = /@flow/;

export function isTypeScriptSource(fileName: string) {
  return !!fileName && fileName.endsWith('.ts');
}

export function isTSXSource(fileName: string) {
  return !!fileName && fileName.endsWith('.tsx');
}

/**
 * Previous loaders pass their source map either serialized or as an object
 * (e.g. `flow-loader`, Babel), while Babel expects an object.
 */
export function normalizeInputSourceMap(
  sourceMap: string | RawSourceMap | undefined
): TransformOptions['inputSourceMap'] {
  if (!sourceMap) return undefined;
  return typeof sourceMap === 'string' ? JSON.parse(sourceMap) : sourceMap;
}

/**
 * Decides whether a source file needs the React Native parser (hermes-parser or flow-parser).
 *
 * Mirrors the React Native preset's parser syntax plugin with its default
 * `parseLangTypes: 'flow'`, which sends only files carrying an `@flow` pragma to the parser
 * and leaves everything else to `@babel/parser`. The parser converts its own AST into a Babel
 * AST, and that conversion is quadratic in the number of sibling nodes, so prebuilt minified
 * dependencies can take minutes.
 *
 * `flow: 'all'` opts every file back into the React Native parser.
 */
export function shouldUseReactNativeParser(
  src: string,
  flow?: 'all' | 'detect'
): boolean {
  return flow === 'all' || FLOW_PRAGMA_REGEX.test(src);
}

export async function loadReactNativeParser(
  projectRoot?: string | null,
  providedParserPath?: string
): Promise<ReactNativeParser> {
  const parserPath =
    providedParserPath ??
    resolveReactNativeParser(projectRoot ?? process.cwd()).parserPath;

  try {
    return await importDefaultESM<ReactNativeParser>(parserPath);
  } catch (cause) {
    throw Object.assign(
      new Error(`Failed to import the React Native parser at '${parserPath}'.`),
      { cause }
    );
  }
}

/**
 * Parses a Flow source with the project's React Native parser into a Babel AST.
 *
 * The parser lowers Flow syntax that has no Babel plugin (e.g. `component`
 * declarations); enums are left for `babel-plugin-transform-flow-enums` and
 * type annotations for `@babel/plugin-transform-flow-strip-types`.
 */
export async function parseReactNativeSource(
  src: string,
  {
    projectRoot,
    parserPath,
    flow,
    sourceType = 'unambiguous',
    overrides,
  }: {
    projectRoot: string;
    parserPath?: string;
    flow?: HermesParserOverrides['flow'];
    sourceType?: HermesParserOverrides['sourceType'] | null;
    overrides?: HermesParserOverrides;
  }
): Promise<ParseResult> {
  const parser = await loadReactNativeParser(projectRoot, parserPath);

  return parser.parse(src, {
    babel: true,
    // the parser rejects `flow: undefined`
    ...(flow && { flow }),
    reactRuntimeTarget: resolveReactRuntimeTarget(projectRoot),
    sourceType,
    ...overrides,
  });
}

const IGNORED_REPACK_FILENAMES = [
  'IncludeModules.js',
  'WebpackHMRClient.js',
].map((name) => name.replace(/\./g, '\\.'));

const IGNORED_REPACK_PATHS_REGEX = new RegExp(
  `repack/dist/modules/(${IGNORED_REPACK_FILENAMES.join('|')})$`
);

export function isIgnoredRepackDeepImport(filename: string): boolean {
  return IGNORED_REPACK_PATHS_REGEX.test(filename);
}

interface BabelCallerSource {
  context?: string | null;
  rootContext?: string;
  /** Custom value set by BabelPlugin through `options.loader`. */
  repack?: unknown;
  _compiler?: { options?: { name?: string } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getPlatform(loaderContext: BabelCallerSource): string | undefined {
  // set by BabelPlugin through `options.loader`, the only channel that also
  // reaches loaders running in Rspack's parallel mode
  if (isRecord(loaderContext.repack)) {
    const { platform } = loaderContext.repack;
    if (typeof platform === 'string') return platform;
  }
  // without the plugin, fall back to the compiler name used as the platform
  return loaderContext._compiler?.options?.name;
}

interface BabelRuntime {
  babelRuntimeModuleName: string;
  enableBabelRuntime: string;
}

const babelRuntimeCache = new Map<string, BabelRuntime | null>();

/**
 * Finds the project's `@babel/runtime` and returns its location and version.
 * `@babel/plugin-transform-runtime` assumes version 7.0.0 when it's not told
 * otherwise and inlines every newer helper into each file that uses it.
 * A version is only safe to target alongside the module it describes,
 * so both are returned as a pair.
 */
export function getBabelRuntime(projectRoot: string): BabelRuntime | null {
  const cached = babelRuntimeCache.get(projectRoot);
  if (cached !== undefined) return cached;

  let babelRuntime: BabelRuntime | null = null;
  try {
    const manifestPath = require.resolve('@babel/runtime/package.json', {
      paths: [projectRoot],
    });
    const manifest: unknown = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (isRecord(manifest) && typeof manifest.version === 'string') {
      babelRuntime = {
        babelRuntimeModuleName: path.dirname(manifestPath),
        enableBabelRuntime: manifest.version,
      };
    }
  } catch {
    // @babel/runtime is not installed, let the preset use its defaults
  }

  babelRuntimeCache.set(projectRoot, babelRuntime);
  return babelRuntime;
}

/**
 * Caller data for Babel, mirroring what Metro passes to
 * `@react-native/babel-preset`. Without it the preset falls back to defaults:
 * no `Platform.OS` / `Platform.select` inlining and no `@babel/runtime` version.
 * Presets that don't read these keys ignore them.
 */
export function getBabelCaller(loaderContext: BabelCallerSource) {
  const platform = getPlatform(loaderContext);
  // parallel loaders in Rspack had a bug where rootContext
  // was the same as context, so we only trust it when they differ
  const projectRoot =
    loaderContext.rootContext &&
    loaderContext.rootContext !== loaderContext.context
      ? loaderContext.rootContext
      : process.cwd();
  const babelRuntime = getBabelRuntime(projectRoot);

  return {
    name: '@callstack/repack',
    ...(platform ? { platform, inlinePlatform: true } : null),
    ...babelRuntime,
  };
}
