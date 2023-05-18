import fs from 'fs';
import path from 'path';

import logger from '../utils/logger.js';

function findProjectPbxProjPath(cwd: string) {
  const iosPath = path.join(cwd, 'ios');
  const iosDir = fs.readdirSync(iosPath);
  const xcodeProjDir = iosDir.find((dir) => dir.endsWith('.xcodeproj'));

  if (!xcodeProjDir) {
    throw new Error('No directory with "project.pbxproj" found');
  }

  const pbxProjPath = path.join(iosPath, xcodeProjDir, 'project.pbxproj');
  return pbxProjPath;
}

function modifyPbxProjConfig(config: string): string {
  const fallbackMessage =
    'To finish the setup for iOS, You need to edit the file manually.\n' +
    'Follow instructions at: https://re-pack.netlify.app/docs/getting-started/#4-configure-xcode';

  const pbxShellScriptBuildPhaseIndex = config.indexOf(
    'PBXShellScriptBuildPhase'
  );

  if (pbxShellScriptBuildPhaseIndex === -1) {
    throw new Error(
      'Could not find PBXShellScriptBuildPhase section in project.pbxproj\n' +
        fallbackMessage
    );
  }

  const shellScriptIndex = config.indexOf(
    'shellScript =',
    pbxShellScriptBuildPhaseIndex
  );
  const shellScriptContentBeginIndex = config.indexOf('"', shellScriptIndex);
  const shellScriptContentEndIndex = config.indexOf('";\n', shellScriptIndex);

  if (
    shellScriptIndex === -1 ||
    shellScriptContentBeginIndex === -1 ||
    shellScriptContentEndIndex === -1
  ) {
    throw new Error(
      'Could not find shellScript in PBXShellScriptBuildPhase section in project.pbxproj\n' +
        fallbackMessage
    );
  }

  const shellScriptContent = config.slice(
    shellScriptContentBeginIndex + 1, // skip the double quote
    shellScriptContentEndIndex
  );
  const shellScriptContentLines = shellScriptContent.split('\\n');

  const bundleCommand = 'export BUNDLE_COMMAND=webpack-bundle';
  shellScriptContentLines.splice(1, 0, '', bundleCommand, '');

  const updatedShellScriptContent = shellScriptContentLines.join('\\n');
  const updatedConfig =
    config.slice(0, shellScriptContentBeginIndex) +
    `"${updatedShellScriptContent}"` +
    config.slice(shellScriptContentEndIndex + 1); // skip the double quote

  return updatedConfig;
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
  const config = fs.readFileSync(projectPbxProjPath, 'utf-8');

  if (!fs.existsSync(projectPbxProjPath)) {
    throw Error(
      `${relativeProjectPbxProjPath} not found. Make sure you are running this command from the root of your project`
    );
  }

  logger.info(`Found ${relativeProjectPbxProjPath}`);

  const updatedConfig = modifyPbxProjConfig(config);

  fs.writeFileSync(projectPbxProjPath, updatedConfig);
  logger.success(
    `Added "webpack-bundle" as BUNDLE_COMMAND to build phase shellScript in ${relativeProjectPbxProjPath}`
  );
}
