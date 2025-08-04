import type { ParseResult } from '@babel/core';

export interface HermesParser {
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
  projectRoot: string
): Promise<HermesParser> {
  try {
    const hermesParserPath = resolveHermesParser(projectRoot);
    const hermesParser = await import(hermesParserPath);
    return hermesParser;
  } catch (e) {
    console.error(e);
    throw new Error(
      `Failed to import 'hermes-parser'. Make sure you have '@react-native/babel-preset' installed in your project.`
    );
  }
}

loadHermesParser(process.cwd());
