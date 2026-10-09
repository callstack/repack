import { createRequire } from 'node:module';

/**
 * Resolves a dependency of the project's `@react-native/babel-preset`,
 * e.g. a Babel plugin the preset ships with.
 */
export function resolveFromReactNativePreset(
  projectRoot: string,
  request: string
): string {
  const presetPath = require.resolve(
    '@react-native/babel-preset/package.json',
    {
      paths: [projectRoot],
    }
  );

  return createRequire(presetPath).resolve(request);
}

/**
 * Resolves `flow-enums-runtime`, which lowered Flow enums require.
 *
 * Only React Native depends on it, so with isolated installs (pnpm) it often
 * can't be resolved from the project root or from the file using an enum.
 */
export function resolveFlowEnumsRuntime(projectRoot: string): string | null {
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

/**
 * Picks the React runtime that Flow `component` declarations are lowered for,
 * based on the project's `react` version: React 19 passes `ref` as a prop,
 * React 18 needs `forwardRef`. Defaults to React 19.
 */
export function resolveReactRuntimeTarget(projectRoot: string): '18' | '19' {
  try {
    const { version } = require(
      require.resolve('react/package.json', { paths: [projectRoot] })
    );
    return Number.parseInt(version, 10) < 19 ? '18' : '19';
  } catch {
    return '19';
  }
}

export function resolveReactNativeParser(projectRoot: string) {
  let presetLocation = projectRoot;

  try {
    const presetPath = require.resolve(
      '@react-native/babel-preset/package.json',
      {
        paths: [projectRoot],
      }
    );

    const presetRequire = createRequire(presetPath);
    const { version, dependencies } = presetRequire('./package.json');

    presetLocation = `@react-native/babel-preset@${version} (${presetPath})`;

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
