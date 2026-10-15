import { createRequire } from 'node:module';
import type { PluginItem, types } from '@babel/core';

function resolvePreset(projectRoot: string) {
  const presetPath = require.resolve(
    '@react-native/babel-preset/package.json',
    {
      paths: [projectRoot],
    }
  );
  const presetRequire = createRequire(presetPath);
  const { version, dependencies } = presetRequire('./package.json');

  return {
    presetRequire,
    dependencies: dependencies as Record<string, string> | undefined,
    location: `@react-native/babel-preset@${version} (${presetPath})`,
  };
}

/**
 * Caches a lookup per project root: failed resolutions aren't cached by Node,
 * and these run for every transformed file.
 */
function cacheByProjectRoot<T>(resolve: (projectRoot: string) => T) {
  const cache = new Map<string, T>();
  return (projectRoot: string): T => {
    if (!cache.has(projectRoot)) {
      cache.set(projectRoot, resolve(projectRoot));
    }
    return cache.get(projectRoot)!;
  };
}

/**
 * Resolves a dependency of the project's `@react-native/babel-preset`,
 * e.g. a Babel plugin the preset ships with.
 */
export function resolveFromReactNativePreset(
  projectRoot: string,
  request: string
): string {
  let presetLocation = projectRoot;

  try {
    const { presetRequire, location } = resolvePreset(projectRoot);
    presetLocation = location;
    return presetRequire.resolve(request);
  } catch (cause) {
    throw Object.assign(
      new Error(
        `Failed to resolve '${request}' from ${presetLocation}. ` +
          `Make sure '@react-native/babel-preset' is installed.`
      ),
      { cause }
    );
  }
}

/**
 * Resolves `flow-enums-runtime`, which lowered Flow enums require.
 *
 * Only React Native depends on it, so with isolated installs (pnpm) it often
 * can't be resolved from the project root or from the file using an enum.
 */
const resolveFlowEnumsRuntime = cacheByProjectRoot(
  (projectRoot): string | null => {
    try {
      return require.resolve('flow-enums-runtime', { paths: [projectRoot] });
    } catch {}

    try {
      const reactNativePath = require.resolve('react-native/package.json', {
        paths: [projectRoot],
      });
      return createRequire(reactNativePath).resolve('flow-enums-runtime');
    } catch {
      return null;
    }
  }
);

/**
 * `babel-plugin-transform-flow-enums` from the project's React Native preset,
 * or nothing when the preset isn't installed.
 *
 * Has to run ahead of the preset: the preset's `flow-strip-types` removes enum
 * declarations before the preset's own enum plugin gets to them.
 */
export const getFlowEnumsPlugins = cacheByProjectRoot(
  (projectRoot): PluginItem[] => {
    let pluginPath: string;
    try {
      pluginPath = resolveFromReactNativePreset(
        projectRoot,
        'babel-plugin-transform-flow-enums'
      );
    } catch {
      return [];
    }

    const runtimePath = resolveFlowEnumsRuntime(projectRoot);
    // the plugin defaults to `require('flow-enums-runtime')`
    if (!runtimePath) return [pluginPath];

    return [
      [
        pluginPath,
        {
          getRuntime: (t: typeof types) =>
            t.callExpression(t.identifier('require'), [
              t.stringLiteral(runtimePath),
            ]),
        },
      ],
    ];
  }
);

/**
 * Picks the React runtime that Flow `component` declarations are lowered for,
 * based on the project's `react` version: React 19 passes `ref` as a prop,
 * React 18 needs `forwardRef`. Defaults to React 19.
 */
export const resolveReactRuntimeTarget = cacheByProjectRoot(
  (projectRoot): '18' | '19' => {
    try {
      const { version } = require(
        require.resolve('react/package.json', { paths: [projectRoot] })
      );
      return Number.parseInt(version, 10) < 19 ? '18' : '19';
    } catch {
      return '19';
    }
  }
);

export function resolveReactNativeParser(projectRoot: string) {
  let presetLocation = projectRoot;

  try {
    const { presetRequire, dependencies, location } =
      resolvePreset(projectRoot);
    presetLocation = location;

    // A hoisted parser must not override the one declared by the preset.
    if (dependencies?.['flow-parser']) {
      return {
        parserPath: presetRequire.resolve('flow-parser'),
        babelPluginPath: presetRequire.resolve('flow-parser/babel-plugin'),
      };
    }

    const babelPluginPath = presetRequire.resolve(
      'babel-plugin-syntax-hermes-parser'
    );

    const pluginRequire = createRequire(babelPluginPath);

    return {
      parserPath: pluginRequire.resolve('hermes-parser'),
      babelPluginPath,
    };
  } catch (cause) {
    throw Object.assign(
      new Error(
        `Failed to resolve the React Native parser from ${presetLocation}. ` +
          `Make sure '@react-native/babel-preset' and its parser dependencies ` +
          `('flow-parser' or 'babel-plugin-syntax-hermes-parser' with 'hermes-parser') are installed.`
      ),
      { cause }
    );
  }
}
