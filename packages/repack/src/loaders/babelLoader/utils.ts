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

export function isTypeScriptSource(fileName: string) {
  return !!fileName && fileName.endsWith('.ts');
}

export function isTSXSource(fileName: string) {
  return !!fileName && fileName.endsWith('.tsx');
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
