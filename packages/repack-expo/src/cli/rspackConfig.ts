export type RspackFederationUsage = 'none' | 'raw' | 'v1' | 'v2';

function maskJavaScriptNonCode(source: string, maskStrings: boolean): string {
  let result = '';
  let state: 'block-comment' | 'code' | 'line-comment' | 'string' = 'code';
  let quote = '';

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index] as string;
    const next = source[index + 1];

    if (state === 'line-comment') {
      if (character === '\n' || character === '\r') {
        state = 'code';
        result += character;
      } else {
        result += ' ';
      }
      continue;
    }

    if (state === 'block-comment') {
      if (character === '*' && next === '/') {
        result += '  ';
        index += 1;
        state = 'code';
      } else {
        result += character === '\n' || character === '\r' ? character : ' ';
      }
      continue;
    }

    if (state === 'string') {
      if (character === '\\' && next !== undefined) {
        result += maskStrings ? '  ' : `${character}${next}`;
        index += 1;
      } else {
        result +=
          maskStrings && character !== '\n' && character !== '\r'
            ? ' '
            : character;
        if (character === quote) state = 'code';
      }
      continue;
    }

    if (character === '/' && next === '/') {
      result += '  ';
      index += 1;
      state = 'line-comment';
    } else if (character === '/' && next === '*') {
      result += '  ';
      index += 1;
      state = 'block-comment';
    } else if (character === "'" || character === '"' || character === '`') {
      quote = character;
      state = 'string';
      result += maskStrings ? ' ' : character;
    } else {
      result += character;
    }
  }

  return result;
}

function importsPackage(source: string, packageName: string): boolean {
  const escapedName = packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `(?:\\bfrom\\s*|\\brequire\\s*\\(\\s*)['"]${escapedName}['"]`
  ).test(source);
}

function rawFederationPluginAliases(source: string): Set<string> {
  const aliases = new Set(['ModuleFederationPlugin']);
  for (const match of source.matchAll(
    /ModuleFederationPlugin\s*(?:as\s+|:\s*)([A-Za-z_$][\w$]*)/g
  )) {
    aliases.add(match[1] as string);
  }
  for (const match of source.matchAll(
    /\bimport\s+([A-Za-z_$][\w$]*)\s+from\s*['"]@module-federation\/enhanced\/rspack['"]/g
  )) {
    aliases.add(match[1] as string);
  }
  return aliases;
}

function repackFederationPluginAliases(source: string): {
  v1: Set<string>;
  v2: Set<string>;
} {
  const aliases = {
    v1: new Set(['ModuleFederationPlugin', 'ModuleFederationPluginV1']),
    v2: new Set(['ModuleFederationPluginV2']),
  };
  for (const match of source.matchAll(
    /(ModuleFederationPlugin(?:V[12])?)\s*(?:as\s+|:\s*)([A-Za-z_$][\w$]*)/g
  )) {
    const version = match[1] === 'ModuleFederationPluginV2' ? 'v2' : 'v1';
    aliases[version].add(match[2] as string);
  }
  return aliases;
}

export function getRspackFederationUsage(
  contents: string
): RspackFederationUsage {
  const source = maskJavaScriptNonCode(contents, false);
  const executable = maskJavaScriptNonCode(contents, true);
  const constructors = new Set(
    [
      ...executable.matchAll(
        /\bnew\s+(?:[A-Za-z_$][\w$]*\s*\.\s*)*([A-Za-z_$][\w$]*)\s*\(/g
      ),
    ].map((match) => match[1] as string)
  );
  const importsRawPlugin = importsPackage(
    source,
    '@module-federation/enhanced/rspack'
  );
  if (
    importsRawPlugin &&
    [...rawFederationPluginAliases(source)].some((name) =>
      constructors.has(name)
    )
  ) {
    return 'raw';
  }

  if (!importsPackage(source, '@callstack/repack')) return 'none';
  const repackAliases = repackFederationPluginAliases(source);
  if ([...repackAliases.v1].some((name) => constructors.has(name))) {
    return 'v1';
  }
  if ([...repackAliases.v2].some((name) => constructors.has(name))) {
    return 'v2';
  }
  return 'none';
}

export function isRspackConfigCompatible(contents: string): boolean {
  const federation = getRspackFederationUsage(contents);
  return (
    /@callstack\/repack-expo\/rspack/.test(contents) &&
    /new\s+(?:\w+\.)?ExpoPlugin\s*\(/.test(contents) &&
    !/new\s+(?:Repack\.)?RepackPlugin\s*\(/.test(contents) &&
    federation !== 'raw' &&
    federation !== 'v1'
  );
}
