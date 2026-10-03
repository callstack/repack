import { createRequire } from 'node:module';

export function resolveReactNativeParser(projectRoot: string) {
  const presetPath = require.resolve(
    '@react-native/babel-preset/package.json',
    {
      paths: [projectRoot],
    }
  );
  const presetRequire = createRequire(presetPath);
  const { dependencies } = presetRequire('./package.json');

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
}
