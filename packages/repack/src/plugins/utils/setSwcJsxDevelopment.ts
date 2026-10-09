type SwcLoaderOptions = {
  jsc?: { transform?: { react?: { development?: boolean } } };
};

type RuleLike = {
  loader?: string;
  options?: unknown;
  use?: unknown;
  oneOf?: unknown;
  rules?: unknown;
};

function isSwcLoader(item: unknown): item is RuleLike {
  return (
    typeof item === 'object' &&
    item !== null &&
    (item as RuleLike).loader === 'builtin:swc-loader'
  );
}

function withDevelopment(options: unknown, development: boolean) {
  const swcOptions = options as SwcLoaderOptions | undefined;
  const react = swcOptions?.jsc?.transform?.react;
  if (typeof react !== 'object' || react.development !== undefined) {
    return options;
  }

  // nested option objects can be shared between rules, so copy them
  return {
    ...swcOptions,
    jsc: {
      ...swcOptions!.jsc,
      transform: {
        ...swcOptions!.jsc!.transform,
        react: { ...react, development },
      },
    },
  };
}

/**
 * Makes `builtin:swc-loader` JSX development transforms (`jsxDEV`, `__source`,
 * `__self`) follow the build mode. Config helpers like `getSwcLoaderOptions`
 * don't know the mode, so only an explicit `jsc.transform.react.development`
 * is left untouched.
 */
export function setSwcJsxDevelopment(rules: unknown, development: boolean) {
  if (!Array.isArray(rules)) return;

  for (const rule of rules as RuleLike[]) {
    if (!rule || typeof rule !== 'object') continue;

    if (isSwcLoader(rule)) {
      rule.options = withDevelopment(rule.options, development);
    }

    if (Array.isArray(rule.use)) {
      rule.use = rule.use.map((item) =>
        isSwcLoader(item)
          ? { ...item, options: withDevelopment(item.options, development) }
          : item
      );
    } else if (isSwcLoader(rule.use)) {
      rule.use = {
        ...rule.use,
        options: withDevelopment(rule.use.options, development),
      };
    }

    setSwcJsxDevelopment(rule.oneOf, development);
    setSwcJsxDevelopment(rule.rules, development);
  }
}
