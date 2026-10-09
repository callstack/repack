// Babel presets that bring the hermes-parser matching the application's
// Expo SDK and React Native version, in order of preference.
const BABEL_PRESETS = ['babel-preset-expo', '@react-native/babel-preset'];

const resolvedByProjectRoot = new Map<string, string>();

function resolveFromPreset(
  preset: string,
  projectRoot: string
): string | undefined {
  try {
    const presetPath = require.resolve(preset, { paths: [projectRoot] });
    const syntaxPluginPath = require.resolve(
      'babel-plugin-syntax-hermes-parser',
      { paths: [presetPath] }
    );
    return require.resolve('hermes-parser', { paths: [syntaxPluginPath] });
  } catch {
    return undefined;
  }
}

/**
 * Resolve the hermes-parser used to parse JavaScript sources.
 *
 * Re.Pack's Babel loader looks it up through the application's
 * `@react-native/babel-preset`, which Expo applications don't install. Prefer
 * the copy used by the application's own Babel preset so the parser follows
 * the Expo SDK, and fall back to the version bundled with this package.
 */
export function resolveHermesParser(projectRoot: string): string {
  const cached = resolvedByProjectRoot.get(projectRoot);
  if (cached) return cached;

  let hermesParserPath: string | undefined;
  for (const preset of BABEL_PRESETS) {
    hermesParserPath = resolveFromPreset(preset, projectRoot);
    if (hermesParserPath) break;
  }
  hermesParserPath ??= require.resolve('hermes-parser');

  resolvedByProjectRoot.set(projectRoot, hermesParserPath);
  return hermesParserPath;
}
