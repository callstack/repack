import { ASSET_EXTENSIONS, getAssetExtensionsRegExp } from '@callstack/repack';

type LoaderOptions = Record<string, unknown>;
type LoaderUse = string | { loader?: string; options?: LoaderOptions };
type Rule = {
  loader?: string;
  oneOf?: Rule[];
  options?: LoaderOptions;
  rules?: Rule[];
  test?: unknown;
  use?: LoaderUse | LoaderUse[];
};

const REPACK_ASSETS_LOADER =
  /(?:^|[/\\])(?:assets-loader|assetsLoader)(?:[/\\]|$)/;

function testMatchesFilename(test: unknown, filename: string): boolean {
  if (test instanceof RegExp) {
    const lastIndex = test.lastIndex;
    test.lastIndex = 0;
    const matches = test.test(filename);
    test.lastIndex = lastIndex;
    return matches;
  }
  if (Array.isArray(test)) {
    return test.some((condition) => testMatchesFilename(condition, filename));
  }
  return typeof test === 'string' && filename.endsWith(test);
}

function hasRuleForFilename(rules: unknown[], filename: string): boolean {
  return rules.some((value) => {
    if (typeof value !== 'object' || value === null) return false;
    const rule = value as Rule;
    return (
      testMatchesFilename(rule.test, filename) ||
      hasRuleForFilename(
        [...(rule.oneOf ?? []), ...(rule.rules ?? [])],
        filename
      )
    );
  });
}

function withPlatform(use: LoaderUse, platform: 'android' | 'ios'): LoaderUse {
  const loader = typeof use === 'string' ? use : use.loader;
  if (!loader || !REPACK_ASSETS_LOADER.test(loader)) return use;

  return {
    ...(typeof use === 'string' ? {} : use),
    loader,
    options: {
      ...(typeof use === 'string' ? {} : use.options),
      platform,
    },
  };
}

function configureRulePlatform(rule: Rule, platform: 'android' | 'ios'): void {
  if (rule.loader && REPACK_ASSETS_LOADER.test(rule.loader)) {
    rule.options = { ...rule.options, platform };
  }

  if (rule.use) {
    const uses = Array.isArray(rule.use) ? rule.use : [rule.use];
    const configuredUses = uses.map((use) => withPlatform(use, platform));
    rule.use = Array.isArray(rule.use) ? configuredUses : configuredUses[0];
  }

  for (const child of [...(rule.oneOf ?? []), ...(rule.rules ?? [])]) {
    configureRulePlatform(child, platform);
  }
}

export function configureExpoAssets(
  rules: unknown[],
  assetsLoaderPath: string,
  platform: 'android' | 'ios'
): void {
  for (const rule of rules) {
    if (typeof rule === 'object' && rule !== null) {
      configureRulePlatform(rule as Rule, platform);
    }
  }

  const missingExtensions = ASSET_EXTENSIONS.filter(
    (extension) => !hasRuleForFilename(rules, `asset.${extension}`)
  );
  if (missingExtensions.length > 0) {
    rules.push({
      test: getAssetExtensionsRegExp(missingExtensions),
      type: 'javascript/auto',
      use: {
        loader: assetsLoaderPath,
        options: { platform },
      },
    });
  }

  if (!hasRuleForFilename(rules, 'asset.xml')) {
    rules.push({
      test: /\.xml$/,
      type: 'javascript/auto',
      use: {
        loader: assetsLoaderPath,
        options: { platform },
      },
    });
  }
}
