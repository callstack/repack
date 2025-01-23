import fs from 'node:fs';
import path from 'node:path';
import dedent from 'dedent';
import xcode from 'xcode';

import logger from '../utils/logger.js';

interface ShellScriptBuildPhase {
  isa: 'PBXShellScriptBuildPhase';
  name: string;
  shellScript: string;
}

function findProjectPbxProjPath(cwd: string) {
  const iosPath = path.join(cwd, 'ios');
  const iosDir = fs.readdirSync(iosPath);
  const xcodeProjDir = iosDir.find((dir) => dir.endsWith('.xcodeproj'));

  if (!xcodeProjDir) {
    throw new Error('No directory with "project.pbxproj" found');
  }

  const pbxprojPath = path.join(iosPath, xcodeProjDir, 'project.pbxproj');
  return pbxprojPath;
}

function getBundleReactNativePhase(
  project: xcode.XcodeProject
): ShellScriptBuildPhase {
  const shellScriptBuildPhase = project.hash.project.objects
    .PBXShellScriptBuildPhase as Record<string, ShellScriptBuildPhase>;
  const bundleReactNative = Object.values(shellScriptBuildPhase).find(
    (buildPhase) => buildPhase.name === '"Bundle React Native code and images"'
  );

  if (!bundleReactNative) {
    throw new Error(
      `Couldn't find a build phase "Bundle React Native code and images"`
    );
  }

  return bundleReactNative;
}

function replaceBundleReactNativeShellScript(
  phase: ShellScriptBuildPhase
): ShellScriptBuildPhase {
  const script = dedent`
    set -e

    if [[ -f "$PODS_ROOT/../.xcode.env" ]]; then
    source "$PODS_ROOT/../.xcode.env"
    fi
    if [[ -f "$PODS_ROOT/../.xcode.env.local" ]]; then
    source "$PODS_ROOT/../.xcode.env.local"
    fi

    export CLI_PATH="$("$NODE_BINARY" --print "require('path').dirname(require.resolve('@react-native-community/cli/package.json')) + '/build/bin.js'")"

    WITH_ENVIRONMENT="$REACT_NATIVE_PATH/scripts/xcode/with-environment.sh"
    REACT_NATIVE_XCODE="$REACT_NATIVE_PATH/scripts/react-native-xcode.sh"

    /bin/sh -c "$WITH_ENVIRONMENT $REACT_NATIVE_XCODE"
  `;

  phase.shellScript = `"${script.replace(/"/g, '\\"').split('\n').join('\\n')}\\n"`;

  return phase;
}

function modifyPbxprojConfig(pbxprojPath: string) {
  const project = xcode.project(pbxprojPath);
  project.parseSync();

  const bundleReactNativePhase = getBundleReactNativePhase(project);
  replaceBundleReactNativeShellScript(bundleReactNativePhase);

  return project.writeSync();
}

/**
 * Modifies the iOS part of the project to support Re.Pack
 *
 * @param cwd current working directory
 * @param reactNativeVersion version of react-native in project
 */
export default function modifyIOS(cwd: string) {
  const projectPbxProjPath = findProjectPbxProjPath(cwd);
  const relativeProjectPbxProjPath = path.relative(cwd, projectPbxProjPath);

  if (!fs.existsSync(projectPbxProjPath)) {
    throw Error(
      `${relativeProjectPbxProjPath} not found. Make sure you are running this command from the root of your project`
    );
  }

  logger.info(`Found ${relativeProjectPbxProjPath}`);

  const updatedConfig = modifyPbxprojConfig(projectPbxProjPath);

  fs.writeFileSync(projectPbxProjPath, updatedConfig);

  logger.info(
    `Added "@react-native-community/cli" as CLI_PATH to build phase shellScript in ${relativeProjectPbxProjPath}`
  );

  // logger.success('Successfully modified iOS project files');
}
