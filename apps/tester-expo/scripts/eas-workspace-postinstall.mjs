import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..', '..', '..');

export function createWorkspaceBuildCommand(root = repositoryRoot) {
  return {
    arguments_: [
      '--dir',
      root,
      '--filter',
      'tester-expo^...',
      '--workspace-concurrency=1',
      'run',
      'build',
    ],
    command: 'pnpm',
  };
}

export function createRepackDoctorCommand(root = repositoryRoot) {
  return {
    arguments_: [
      path.join(root, 'packages', 'repack-expo', 'dist', 'cli', 'bin.js'),
      'doctor',
    ],
    command: process.execPath,
    cwd: path.join(root, 'apps', 'tester-expo'),
  };
}

export function createExpoPrebuildCommand(platform, root = repositoryRoot) {
  return {
    arguments_: [
      '--dir',
      path.join(root, 'apps', 'tester-expo'),
      'exec',
      'expo',
      'prebuild',
      '--clean',
      '--no-install',
      '--platform',
      platform,
    ],
    command: 'pnpm',
    cwd: root,
  };
}

export function shouldGenerateNativeProject(
  platform,
  root = repositoryRoot,
  pathExists = existsSync
) {
  return !pathExists(path.join(root, 'apps', 'tester-expo', platform));
}

export function shouldBuildEasWorkspaces(environment = process.env) {
  return (
    environment.EAS_BUILD_PLATFORM === 'android' ||
    environment.EAS_BUILD_PLATFORM === 'ios'
  );
}

function runCheckedCommand(
  { arguments_, command, cwd },
  { environment, label, root, run }
) {
  const result = run(command, arguments_, {
    cwd: cwd ?? root,
    env: environment,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${label} exited with status ${result.status}`);
  }
}

export function runEasWorkspacePostinstall({
  environment = process.env,
  pathExists = existsSync,
  root = repositoryRoot,
  run = spawnSync,
} = {}) {
  if (!shouldBuildEasWorkspaces(environment)) {
    console.log('Skipping EAS workspace build outside an EAS Build worker.');
    return;
  }

  console.log(
    `Building tester-expo workspace dependencies for EAS ${environment.EAS_BUILD_PLATFORM}.`
  );
  runCheckedCommand(createWorkspaceBuildCommand(root), {
    environment,
    label: 'EAS workspace dependency build',
    root,
    run,
  });

  const platform = environment.EAS_BUILD_PLATFORM;
  if (shouldGenerateNativeProject(platform, root, pathExists)) {
    const prebuild = createExpoPrebuildCommand(platform, root);
    console.log(`Generating the EAS ${platform} project with Expo prebuild.`);
    runCheckedCommand(prebuild, {
      environment,
      label: 'Expo prebuild',
      root,
      run,
    });
  }

  const doctor = createRepackDoctorCommand(root);
  console.log('Validating the EAS native project with Re.Pack Expo doctor.');
  runCheckedCommand(doctor, {
    environment,
    label: 'Re.Pack Expo doctor',
    root,
    run,
  });
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  runEasWorkspacePostinstall();
}
