import fs from 'node:fs';
import path from 'node:path';
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

function modifyBundleReactNativeShellScript(
  phase: ShellScriptBuildPhase
): ShellScriptBuildPhase {
  const shellScriptContent = phase.shellScript;
  const shellScriptContentLines = shellScriptContent.split('\\n');

  const bundleCommand = 'export BUNDLE_COMMAND=webpack-bundle';

  if (shellScriptContentLines.includes(bundleCommand)) {
    logger.info(
      `${phase.name} phase in project.pbxproj already contains ${bundleCommand}`
    );
    return phase;
  }

  shellScriptContentLines.splice(1, 0, '', bundleCommand);

  phase.shellScript = shellScriptContentLines.join('\\n');
  return phase;
}

function modifyPbxprojConfig(pbxprojPath: string) {
  let project = xcode.project(pbxprojPath);
  project.parseSync();

  const bundleReactNativePhase = getBundleReactNativePhase(project);
  modifyBundleReactNativeShellScript(bundleReactNativePhase);

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
  logger.success(
    `Added "webpack-bundle" as BUNDLE_COMMAND to build phase shellScript in ${relativeProjectPbxProjPath}`
  );
}
