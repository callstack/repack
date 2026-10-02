import type { ParseResult } from '@babel/core';
import { importDefaultESM } from '../../helpers/index.js';

interface HermesParser {
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
 * Decides whether a source file needs hermes-parser.
 *
 * Mirrors `babel-plugin-syntax-hermes-parser` with the React Native preset's default
 * `parseLangTypes: 'flow'`, which sends only files carrying an `@flow` pragma to hermes-parser
 * and leaves everything else to `@babel/parser`. hermes-parser converts its own AST into a Babel
 * AST, and that conversion is quadratic in the number of sibling nodes, so prebuilt minified
 * dependencies can take minutes.
 *
 * `flow: 'all'` opts every file back into hermes-parser.
 */
export function shouldUseHermesParser(
  src: string,
  flow?: 'all' | 'detect'
): boolean {
  return flow === 'all' || FLOW_PRAGMA_REGEX.test(src);
}

function resolveHermesParser(projectRoot: string) {
  const reactNativeBabelPresetPath = require.resolve(
    '@react-native/babel-preset',
    { paths: [projectRoot] }
  );

  const babelPluginSyntaxHermesParserPath = require.resolve(
    'babel-plugin-syntax-hermes-parser',
    { paths: [reactNativeBabelPresetPath] }
  );

  const hermesParserPath = require.resolve('hermes-parser', {
    paths: [babelPluginSyntaxHermesParserPath],
  });

  return hermesParserPath;
}

export async function loadHermesParser(
  projectRoot?: string | null,
  providedHermesParserPath?: string
): Promise<HermesParser> {
  try {
    const hermesParserPath =
      providedHermesParserPath ??
      resolveHermesParser(projectRoot ?? process.cwd());
    const hermesParser = await importDefaultESM<HermesParser>(hermesParserPath);
    return hermesParser;
  } catch (e) {
    console.error(e);
    throw new Error(
      `Failed to import 'hermes-parser'. Make sure you have '@react-native/babel-preset' installed in your project.`
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
