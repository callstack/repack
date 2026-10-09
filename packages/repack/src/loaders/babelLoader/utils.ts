import type { ParseResult } from '@babel/core';
import { importDefaultESM } from '../../helpers/index.js';
import { resolveReactNativeParser } from '../../helpers/resolveReactNativeParser.js';

interface ReactNativeParser {
  parse: (
    src: string,
    opts: {
      babel: boolean;
      flow?: 'all' | 'detect';
      reactRuntimeTarget: string;
      sourceType: 'script' | 'module' | 'unambiguous' | null | undefined;
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
