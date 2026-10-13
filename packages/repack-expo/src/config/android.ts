import {
  CodeGenerator,
  type ConfigPlugin,
  withAppBuildGradle,
  withMainApplication,
} from 'expo/config-plugins';
import { ConfigPluginError } from './ConfigPluginError.js';
import {
  assertUniqueAnchor,
  createWhitespaceTolerantAnchor,
  hasIntactGeneratedSection,
  replaceLineWithGeneratedSection,
} from './generated.js';
import type { RepackExpoPluginOptions } from './options.js';

const ANDROID_MAIN_MODULE_TAG = 'repack-expo-android-main-module';
const ANDROID_BUNDLE_COMMAND_TAG = 'repack-expo-android-bundle-command';
const EXPO_CLI_BLOCK = `// Use Expo CLI to bundle the app, this ensures the Metro config
// works correctly with Expo projects.
cliFile = new File(["node", "--print", "require.resolve('@expo/cli', { paths: [require.resolve('expo/package.json')] })"].execute(null, rootDir).text.trim())
bundleCommand = "export:embed"`;
const REPACK_CLI_BLOCK = `    cliFile = new File(["node", "--print", "require.resolve('@react-native-community/cli/build/bin.js')"].execute(null, rootDir).text.trim())
    bundleCommand = "bundle"`;

function androidProjectFile(value: string): string {
  const path = value.startsWith('/') ? value : `../${value}`;
  return `rootProject.file(${JSON.stringify(path)})`;
}

function createAndroidCliBlock(options: RepackExpoPluginOptions): string {
  const lines = [REPACK_CLI_BLOCK];
  if (options.entry) {
    lines.push(`    entryFile = ${androidProjectFile(options.entry)}`);
  }
  if (options.configPath) {
    lines.push(`    bundleConfig = ${androidProjectFile(options.configPath)}`);
  }
  return lines.join('\n');
}

export function configureAndroidMainApplication(
  contents: string,
  language: string
): string {
  if (language !== 'kt') {
    throw new ConfigPluginError({
      code: 'INCOMPATIBLE_NATIVE_TEMPLATE',
      message: `Expected a Kotlin Expo MainApplication, received ${language}.`,
      recovery:
        'Regenerate with a supported Expo SDK 56+ Kotlin template or report the native template for explicit support.',
    });
  }

  assertUniqueAnchor(
    contents,
    createWhitespaceTolerantAnchor('ExpoReactHostFactory.getDefaultReactHost('),
    'ExpoReactHostFactory call'
  );
  if (
    hasIntactGeneratedSection({
      comment: '      //',
      contents,
      newSrc: '      jsMainModulePath = "index",',
      tag: ANDROID_MAIN_MODULE_TAG,
    })
  ) {
    return contents;
  }

  assertUniqueAnchor(
    contents,
    createWhitespaceTolerantAnchor('packageList ='),
    'ExpoReactHostFactory packageList argument'
  );
  return CodeGenerator.mergeContents({
    anchor: /^[\t ]*packageList[\t ]*=/,
    comment: '      //',
    newSrc: '      jsMainModulePath = "index",',
    offset: 0,
    src: contents,
    tag: ANDROID_MAIN_MODULE_TAG,
  }).contents;
}

export function configureAndroidBuildGradle(
  contents: string,
  options: RepackExpoPluginOptions = {}
): string {
  return replaceLineWithGeneratedSection({
    anchorLine: createWhitespaceTolerantAnchor(EXPO_CLI_BLOCK),
    comment: '    //',
    contents,
    replacementLine: createAndroidCliBlock(options),
    tag: ANDROID_BUNDLE_COMMAND_TAG,
  });
}

export const withAndroidRepack: ConfigPlugin<RepackExpoPluginOptions | void> = (
  config,
  options = {}
) => {
  const pluginOptions = options || {};
  const withApplication = withMainApplication(config, (modConfig) => {
    modConfig.modResults.contents = configureAndroidMainApplication(
      modConfig.modResults.contents,
      modConfig.modResults.language
    );
    return modConfig;
  });

  return withAppBuildGradle(withApplication, (modConfig) => {
    modConfig.modResults.contents = configureAndroidBuildGradle(
      modConfig.modResults.contents,
      pluginOptions
    );
    return modConfig;
  });
};
