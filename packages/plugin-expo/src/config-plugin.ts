// plugins/expo-repack-plugin.js
import type { ConfigPlugin } from 'expo/config-plugins';
import { withAppBuildGradle, withXcodeProject } from 'expo/config-plugins';

/**
 * Configuration plugin to remove some expo defaults to ensure that re-pack works correctly.
 *
 * @param current Current expo configuration
 * @returns Modified expo configuration
 */
const plugin: ConfigPlugin = (current) => {
  let res = current;

  // iOS
  // Replace $CLI_PATH and $BUNDLE_COMMAND in the Xcode project (this will ensure that the correct CLI is used in production builds)
  res = withXcodeProject(res, (configuration) => {
    const xcodeProject = configuration.modResults;
    const bundleReactNativeCodeAndImagesBuildPhase =
      xcodeProject.buildPhaseObject(
        'PBXShellScriptBuildPhase',
        'Bundle React Native code and images'
      );

    if (!bundleReactNativeCodeAndImagesBuildPhase) return configuration;

    const script = JSON.parse(
      bundleReactNativeCodeAndImagesBuildPhase.shellScript
    );
    const patched = script
      .replace(
        /if \[\[ -z "\$CLI_PATH" \]\]; then[\s\S]*?fi\n?/g,
        `export CLI_PATH="$("$NODE_BINARY" --print "require('path').dirname(require.resolve('@react-native-community/cli/package.json')) + '/build/bin.js'")"`
      )
      .replace(/if \[\[ -z "\$BUNDLE_COMMAND" \]\]; then[\s\S]*?fi\n?/g, '');

    bundleReactNativeCodeAndImagesBuildPhase.shellScript =
      JSON.stringify(patched);
    return configuration;
  });

  // Android
  // Replace cliFile and bundleCommand in the app/build.gradle file (this will ensure that the correct CLI is used in production builds)
  res = withAppBuildGradle(res, (configuration) => {
    const buildGradle = configuration.modResults.contents;
    const patched = buildGradle
      .replace(/cliFile.*/, '')
      .replace(/bundleCommand.*/, 'bundleCommand = "bundle"');

    configuration.modResults.contents = patched;
    return configuration;
  });

  return res;
};

export default plugin;
