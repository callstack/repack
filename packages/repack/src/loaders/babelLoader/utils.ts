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
