import {
  CodeGenerator,
  type ConfigPlugin,
  IOSConfig,
  withAppDelegate,
  withXcodeProject,
} from 'expo/config-plugins';
import { ConfigPluginError } from './ConfigPluginError.js';
import {
  assertUniqueAnchor,
  hasIntactGeneratedSection,
  replaceLineWithGeneratedSection,
} from './generated.js';
import type { RepackExpoPluginOptions } from './options.js';

const IOS_BUNDLE_URL_TAG = 'repack-expo-ios-bundle-url';
const IOS_BUNDLE_COMMAND_TAG = 'repack-expo-ios-bundle-command';
const EXPO_DEBUG_URL =
  '    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")';
const REPACK_DEBUG_URL =
  '    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")';
const EXPO_CLI_DEFAULTS = `if [[ -z "$CLI_PATH" ]]; then
  # Use Expo CLI
  export CLI_PATH="$("$NODE_BINARY" --print "require.resolve('@expo/cli', { paths: [require.resolve('expo/package.json')] })")"
fi
if [[ -z "$BUNDLE_COMMAND" ]]; then
  # Default Expo CLI command for bundling
  export BUNDLE_COMMAND="export:embed"
fi`;
const XCODE_BUNDLE_SCRIPT_ANCHOR = /react-native-xcode\.sh/;

function escapeShellDoubleQuoted(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('"', '\\"')
    .replaceAll('$', '\\$')
    .replaceAll('`', '\\`');
}

function iosProjectPath(value: string): string {
  const escaped = escapeShellDoubleQuoted(value);
  return value.startsWith('/') ? escaped : `$PROJECT_ROOT/${escaped}`;
}

function createIosBundleOverrides(options: RepackExpoPluginOptions): string {
  const lines = [
    'export CLI_PATH="$("$NODE_BINARY" --print "require.resolve(\'@react-native-community/cli/build/bin.js\')")"',
    'export BUNDLE_COMMAND="bundle"',
  ];
  if (options.entry) {
    lines.push(`export ENTRY_FILE="${iosProjectPath(options.entry)}"`);
  }
  if (options.configPath) {
    lines.push(`export BUNDLE_CONFIG="${iosProjectPath(options.configPath)}"`);
  }
  return lines.join('\n');
}

export function configureIosAppDelegate(
  contents: string,
  language: string
): string {
  if (language !== 'swift') {
    throw new ConfigPluginError({
      code: 'INCOMPATIBLE_NATIVE_TEMPLATE',
      message: `Expected a Swift Expo AppDelegate, received ${language}.`,
      recovery:
        'Regenerate with a supported Expo SDK 56+ Swift template or report the native template for explicit support.',
    });
  }

  for (const anchor of [
    'class ReactNativeDelegate: ExpoReactNativeFactoryDelegate',
    '  override func bundleURL() -> URL? {',
    '    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")',
  ]) {
    assertUniqueAnchor(contents, anchor, 'Expo AppDelegate shape');
  }

  return replaceLineWithGeneratedSection({
    anchorLine: EXPO_DEBUG_URL,
    comment: '    //',
    contents,
    replacementLine: REPACK_DEBUG_URL,
    tag: IOS_BUNDLE_URL_TAG,
  });
}

export function configureIosBundleScript(
  contents: string,
  options: RepackExpoPluginOptions = {}
): string {
  assertUniqueAnchor(
    contents,
    EXPO_CLI_DEFAULTS,
    'Expo iOS CLI bundle defaults'
  );
  assertUniqueAnchor(
    contents,
    XCODE_BUNDLE_SCRIPT_ANCHOR,
    'react-native-xcode.sh invocation'
  );

  const newSrc = createIosBundleOverrides(options);
  if (
    hasIntactGeneratedSection({
      comment: '#',
      contents,
      newSrc,
      tag: IOS_BUNDLE_COMMAND_TAG,
    })
  ) {
    return contents;
  }

  return CodeGenerator.mergeContents({
    anchor: XCODE_BUNDLE_SCRIPT_ANCHOR,
    comment: '#',
    newSrc,
    offset: 0,
    src: contents,
    tag: IOS_BUNDLE_COMMAND_TAG,
  }).contents;
}

type XcodeProject = Parameters<
  typeof IOSConfig.XcodeUtils.getApplicationNativeTarget
>[0]['project'];

type XcodeShellScriptPhase = {
  shellScript?: unknown;
};

export function findIosBundlePhase(
  project: XcodeProject,
  projectName: string
): XcodeShellScriptPhase {
  try {
    const target = IOSConfig.XcodeUtils.getApplicationNativeTarget({
      project,
      projectName,
    });
    const buildPhases: unknown = target.target.buildPhases;
    if (!Array.isArray(buildPhases)) {
      throw new Error('Application target buildPhases is not an array');
    }

    const phaseReferences = buildPhases.filter(
      (phase): phase is { comment?: string; value: string } =>
        typeof phase === 'object' &&
        phase !== null &&
        'value' in phase &&
        typeof phase.value === 'string' &&
        phase.comment === 'Bundle React Native code and images'
    );
    if (phaseReferences.length !== 1) {
      throw new ConfigPluginError({
        code: 'INCOMPATIBLE_NATIVE_TEMPLATE',
        message: `Expected one React Native iOS bundle phase, found ${phaseReferences.length}.`,
        recovery:
          'Regenerate the iOS project with expo prebuild --clean. Custom bundle phases need explicit support.',
      });
    }

    const phaseSection: unknown =
      project.hash.project.objects.PBXShellScriptBuildPhase;
    if (
      !phaseSection ||
      typeof phaseSection !== 'object' ||
      Array.isArray(phaseSection)
    ) {
      throw new Error('PBXShellScriptBuildPhase section is missing');
    }
    const phase: unknown = (phaseSection as Record<string, unknown>)[
      phaseReferences[0]!.value
    ];
    if (!phase || typeof phase !== 'object' || Array.isArray(phase)) {
      throw new ConfigPluginError({
        code: 'INCOMPATIBLE_NATIVE_TEMPLATE',
        message: 'The referenced React Native iOS bundle phase is missing.',
        recovery: 'Regenerate the iOS project with expo prebuild --clean.',
      });
    }
    return phase as XcodeShellScriptPhase;
  } catch (error) {
    if (error instanceof ConfigPluginError) throw error;

    throw new ConfigPluginError({
      code: 'INCOMPATIBLE_NATIVE_TEMPLATE',
      message: `Could not inspect the ${projectName} iOS application target or its build phases.`,
      recovery:
        'Regenerate the iOS project with expo prebuild --clean. If the target still cannot be inspected, report the native template for explicit support.',
    });
  }
}

function decodeShellScript(shellScript: unknown): string {
  if (typeof shellScript !== 'string') {
    throw new ConfigPluginError({
      code: 'INCOMPATIBLE_NATIVE_TEMPLATE',
      message: 'The iOS React Native bundle phase has no shell script.',
      recovery: 'Regenerate the iOS project with expo prebuild --clean.',
    });
  }

  try {
    const decoded: unknown = JSON.parse(shellScript);
    if (typeof decoded === 'string') return decoded;
  } catch {}

  throw new ConfigPluginError({
    code: 'INCOMPATIBLE_NATIVE_TEMPLATE',
    message: 'The iOS React Native bundle phase shell script is malformed.',
    recovery: 'Regenerate the iOS project with expo prebuild --clean.',
  });
}

export const withIosRepack: ConfigPlugin<RepackExpoPluginOptions | void> = (
  config,
  options = {}
) => {
  const pluginOptions = options || {};
  const withDelegate = withAppDelegate(config, (modConfig) => {
    modConfig.modResults.contents = configureIosAppDelegate(
      modConfig.modResults.contents,
      modConfig.modResults.language
    );
    return modConfig;
  });

  return withXcodeProject(withDelegate, (modConfig) => {
    const projectName = modConfig.modRequest.projectName;
    if (!projectName) {
      throw new ConfigPluginError({
        code: 'INCOMPATIBLE_NATIVE_TEMPLATE',
        message: 'Expo did not provide an iOS application target name.',
        recovery: 'Regenerate the iOS project with expo prebuild --clean.',
      });
    }

    const phase = findIosBundlePhase(modConfig.modResults, projectName);

    phase.shellScript = JSON.stringify(
      configureIosBundleScript(
        decodeShellScript(phase.shellScript),
        pluginOptions
      )
    );
    return modConfig;
  });
};
