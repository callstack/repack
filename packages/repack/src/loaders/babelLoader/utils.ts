import type { ParseResult } from '@babel/core';
import { importDefaultESM } from '../../helpers/index.js';
import {
  resolveFlowEnumsRuntime,
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
      transformOptions?: {
        TransformEnumSyntax?: { enable: boolean; getRuntime?: () => unknown };
      };
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
 * declarations) and Flow enums to `flow-enums-runtime`; the remaining type
 * annotations are left for `@babel/plugin-transform-flow-strip-types`.
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
  const runtimePath = resolveFlowEnumsRuntime(projectRoot);

  return parser.parse(src, {
    babel: true,
    // the parser rejects `flow: undefined`
    ...(flow && { flow }),
    reactRuntimeTarget: resolveReactRuntimeTarget(projectRoot),
    sourceType,
    ...overrides,
    transformOptions: {
      TransformEnumSyntax: {
        enable: true,
        // the parser defaults to `require('flow-enums-runtime')`
        getRuntime: runtimePath ? () => requireCall(runtimePath) : undefined,
      },
    },
  });
}

// ESTree `require(request)` in the shape of the parser's own AST builders
function requireCall(request: string) {
  const syntheticLocation = () => ({
    loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
    range: [0, 0],
    parent: null,
  });

  return {
    type: 'CallExpression',
    callee: {
      type: 'Identifier',
      name: 'require',
      optional: false,
      typeAnnotation: null,
      ...syntheticLocation(),
    },
    arguments: [
      {
        type: 'Literal',
        value: request,
        raw: JSON.stringify(request),
        literalType: 'string',
        ...syntheticLocation(),
      },
    ],
    typeArguments: null,
    optional: false,
    ...syntheticLocation(),
  };
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
