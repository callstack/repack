import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const FEDERATION_METADATA_FILES = ['mf-manifest.json', 'mf-stats.json'];
const supportedPlatforms = new Set(['android', 'ios']);

function assertProductionPlatform(platform) {
  if (!supportedPlatforms.has(platform)) {
    throw new Error(
      `Expected production widget platform to be ios or android, received ${JSON.stringify(platform)}`
    );
  }
  return platform;
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
export const defaultProjectRoot = path.resolve(scriptDirectory, '..');

export function resolveProductionArtifactPaths(projectRoot, platform) {
  assertProductionPlatform(platform);
  const standaloneRoot = path.join(
    projectRoot,
    'build',
    'standalone',
    platform
  );
  const bundleFilename =
    platform === 'ios' ? 'main.jsbundle' : 'index.android.bundle';

  return {
    assetsDest:
      platform === 'ios' ? standaloneRoot : path.join(standaloneRoot, 'res'),
    bundleOutput: path.join(standaloneRoot, bundleFilename),
    configPath: path.join(projectRoot, 'rspack.config.mjs'),
    entryFile: path.join(projectRoot, 'index.ts'),
    publishRoot: path.join(projectRoot, 'build', 'remote', platform),
    sourceMapOutput: path.join(standaloneRoot, `${bundleFilename}.map`),
    stagingRoot: path.join(projectRoot, 'build', 'rspack', platform),
    standaloneRoot,
  };
}

export function createBundleInvocation({
  commandName = 'bundle',
  platform,
  projectRoot = defaultProjectRoot,
}) {
  if (commandName !== 'bundle' && commandName !== 'webpack-bundle') {
    throw new Error(
      `Expected Re.Pack production command to be bundle or webpack-bundle, received ${JSON.stringify(commandName)}`
    );
  }
  const paths = resolveProductionArtifactPaths(projectRoot, platform);
  return {
    arguments: [
      commandName,
      '--config',
      paths.configPath,
      '--platform',
      platform,
      '--entry-file',
      paths.entryFile,
      '--dev=false',
      '--bundle-output',
      paths.bundleOutput,
      '--sourcemap-output',
      paths.sourceMapOutput,
      '--assets-dest',
      paths.assetsDest,
    ],
    command: 'react-native',
    cwd: projectRoot,
    paths,
  };
}

export function createFederationMetadataCopyPlan({ publishRoot, stagingRoot }) {
  return FEDERATION_METADATA_FILES.map((filename) => ({
    destination: path.join(publishRoot, filename),
    filename,
    source: path.join(stagingRoot, filename),
  }));
}

export function publishFederationMetadata(
  paths,
  { copyFileSync = fs.copyFileSync, mkdirSync = fs.mkdirSync } = {}
) {
  const plan = createFederationMetadataCopyPlan(paths);
  mkdirSync(paths.publishRoot, { recursive: true });
  for (const item of plan) {
    copyFileSync(item.source, item.destination);
  }
  return plan;
}

function renderInvocation(invocation) {
  return [invocation.command, ...invocation.arguments]
    .map((part) => (part.includes(' ') ? JSON.stringify(part) : part))
    .join(' ');
}

export function runProductionBuild({
  commandName = 'bundle',
  platform,
  projectRoot = defaultProjectRoot,
  spawn = spawnSync,
}) {
  const invocation = createBundleInvocation({
    commandName,
    platform,
    projectRoot,
  });

  fs.rmSync(invocation.paths.publishRoot, { force: true, recursive: true });
  fs.rmSync(invocation.paths.standaloneRoot, { force: true, recursive: true });
  fs.mkdirSync(invocation.paths.standaloneRoot, { recursive: true });

  console.log(`Running ${renderInvocation(invocation)}`);
  const result = spawn(invocation.command, invocation.arguments, {
    cwd: invocation.cwd,
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error) {
    throw new Error(
      `Could not run the standard Re.Pack ${commandName} command: ${result.error.message}`
    );
  }
  if (result.status !== 0) {
    throw new Error(
      `Standard Re.Pack ${commandName} command exited with status ${String(result.status)}`
    );
  }

  const copiedMetadata = publishFederationMetadata(invocation.paths);
  return { copiedMetadata, invocation };
}

function parseArguments(arguments_) {
  const commandName = arguments_.includes('--webpack-bundle')
    ? 'webpack-bundle'
    : 'bundle';
  const positionals = arguments_.filter(
    (argument) => argument !== '--webpack-bundle'
  );
  if (positionals.length !== 1) {
    throw new Error(
      'Usage: node scripts/build-production.mjs <ios|android> [--webpack-bundle]'
    );
  }
  return { commandName, platform: assertProductionPlatform(positionals[0]) };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const options = parseArguments(process.argv.slice(2));
    const result = runProductionBuild(options);
    console.log(
      `Published ${options.platform} Expo widget artifacts to ${result.invocation.paths.publishRoot}.`
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
