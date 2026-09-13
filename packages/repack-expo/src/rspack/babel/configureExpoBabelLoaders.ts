import type { ExpoPublicEnvironmentSnapshot } from '../environment/expoPublicEnvironment.js';
import type { ExpoBabelCaller } from './createExpoBabelCaller.js';

type LoaderOptions = Record<string, unknown>;
type LoaderUse = string | { loader?: string; options?: LoaderOptions };
type Rule = {
  loader?: string;
  oneOf?: Rule[];
  options?: LoaderOptions;
  rules?: Rule[];
  use?: LoaderUse | LoaderUse[];
};

const REPACK_BABEL_LOADER =
  /(?:^|[/\\])(?:babel-loader|babelLoader)(?:[/\\]|$)/;

function mergeCaller(
  current: unknown,
  caller: ExpoBabelCaller
): Record<string, unknown> {
  return {
    ...(typeof current === 'object' && current !== null ? current : {}),
    ...caller,
  };
}

function configureLoaderOptions(
  loader: string,
  options: LoaderOptions | undefined,
  caller: ExpoBabelCaller,
  publicEnvironment: ExpoPublicEnvironmentSnapshot
): LoaderOptions | undefined {
  if (REPACK_BABEL_LOADER.test(loader)) {
    return {
      ...options,
      caller: mergeCaller(options?.caller, caller),
      expoPublicEnvironment: publicEnvironment,
    };
  }

  return undefined;
}

type ExpoLoaderPaths = {
  babel: string;
};

function getExpoLoaderPath(
  loader: string,
  paths: ExpoLoaderPaths
): string | undefined {
  if (REPACK_BABEL_LOADER.test(loader)) return paths.babel;
  return undefined;
}

function configureUse(
  use: LoaderUse,
  caller: ExpoBabelCaller,
  paths: ExpoLoaderPaths,
  publicEnvironment: ExpoPublicEnvironmentSnapshot
): LoaderUse {
  const loader = typeof use === 'string' ? use : use.loader;
  if (!loader) return use;

  const expoLoader = getExpoLoaderPath(loader, paths);
  const options = configureLoaderOptions(
    loader,
    typeof use === 'string' ? undefined : use.options,
    caller,
    publicEnvironment
  );
  if (!expoLoader || !options) return use;

  return {
    ...(typeof use === 'string' ? {} : use),
    loader: expoLoader,
    options,
  };
}

function configureRule(
  rule: Rule,
  caller: ExpoBabelCaller,
  paths: ExpoLoaderPaths,
  publicEnvironment: ExpoPublicEnvironmentSnapshot
): number {
  let configured = 0;

  if (rule.loader) {
    const options = configureLoaderOptions(
      rule.loader,
      rule.options,
      caller,
      publicEnvironment
    );
    const expoLoader = getExpoLoaderPath(rule.loader, paths);
    if (options && expoLoader) {
      rule.loader = expoLoader;
      rule.options = options;
      configured += 1;
    }
  }

  if (rule.use) {
    const uses = Array.isArray(rule.use) ? rule.use : [rule.use];
    const configuredUses = uses.map((use) =>
      configureUse(use, caller, paths, publicEnvironment)
    );
    configured += configuredUses.filter(
      (use, index) => use !== uses[index]
    ).length;
    rule.use = Array.isArray(rule.use) ? configuredUses : configuredUses[0];
  }

  for (const child of [...(rule.oneOf ?? []), ...(rule.rules ?? [])]) {
    configured += configureRule(child, caller, paths, publicEnvironment);
  }

  return configured;
}

export function configureExpoBabelLoaders(
  rules: unknown[],
  caller: ExpoBabelCaller,
  paths: ExpoLoaderPaths,
  publicEnvironment: ExpoPublicEnvironmentSnapshot
): number {
  let configured = 0;
  for (const rule of rules) {
    if (typeof rule === 'object' && rule !== null) {
      configured += configureRule(
        rule as Rule,
        caller,
        paths,
        publicEnvironment
      );
    }
  }

  if (configured === 0) {
    rules.push({
      test: /\.[cm]?[jt]sx?$/,
      type: 'javascript/auto',
      use: {
        loader: paths.babel,
        options: { caller, expoPublicEnvironment: publicEnvironment },
      },
    });
    configured = 1;
  }

  return configured;
}
