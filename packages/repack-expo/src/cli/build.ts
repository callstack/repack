import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { parseArgs } from 'node:util';

export type BuildOptions = {
  platform: 'android' | 'ios';
  run: boolean;
  scheme?: string;
  device?: string;
  projectRoot?: string;
};

const USAGE =
  'Usage: repack-expo build --platform <android|ios> [--run] [--scheme <ios-scheme>] [--device <name-or-ios-udid>]';

export function parseBuildOptions(args: string[]): BuildOptions {
  const { values } = parseArgs({
    args,
    options: {
      platform: { type: 'string' },
      run: { type: 'boolean', default: false },
      scheme: { type: 'string' },
      device: { type: 'string' },
    },
    allowPositionals: false,
  });
  if (
    !['android', 'ios'].includes(values.platform ?? '') ||
    (values.scheme !== undefined &&
      (!values.scheme || values.platform !== 'ios')) ||
    (values.device !== undefined && (!values.device || !values.run))
  )
    throw new Error(USAGE);
  return {
    platform: values.platform as 'android' | 'ios',
    run: values.run,
    scheme: values.scheme,
    device: values.device,
  };
}

// Inject only process execution: tests still exercise real native-project discovery.
export function runBuild(
  options: BuildOptions,
  spawn: typeof spawnSync = spawnSync
): string {
  const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
  const nativeRoot = path.join(projectRoot, options.platform);
  function execute(
    command: string,
    args: string[],
    capture = false,
    cwd = nativeRoot
  ): string {
    const result = spawn(command, args, {
      cwd,
      encoding: 'utf8',
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      maxBuffer: 16 * 1024 * 1024,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(
        `${command} failed (${result.signal ?? result.status}).${result.stderr ? `\n${result.stderr}` : ''}`
      );
    }
    return result.stdout ?? '';
  }
  function requireFile(file: string, recovery: string): void {
    if (!fs.existsSync(file)) throw new Error(`Missing ${file}. ${recovery}`);
  }
  const prebuild = `Run expo prebuild --platform ${options.platform} first.`;
  requireFile(nativeRoot, prebuild);
  // Resolve before a potentially expensive build, but never invoke Expo to build.
  const expoCli = options.run
    ? createRequire(path.join(projectRoot, 'package.json')).resolve(
        'expo/bin/cli'
      )
    : undefined;
  let binary: string;
  if (options.platform === 'android') {
    if (process.platform === 'win32')
      throw new Error('Android builds currently require macOS or Linux.');
    const gradlew = path.join(nativeRoot, 'gradlew');
    requireFile(gradlew, prebuild);
    execute(gradlew, [':app:assembleRelease']);
    binary = path.join(
      nativeRoot,
      'app/build/outputs/apk/release/app-release.apk'
    );
  } else {
    if (process.platform !== 'darwin')
      throw new Error('iOS simulator builds require macOS and Xcode.');
    const workspaces = fs
      .readdirSync(nativeRoot)
      .filter((name) => name.endsWith('.xcworkspace'));
    if (workspaces.length !== 1)
      throw new Error(
        `Expected one .xcworkspace in ${nativeRoot}. ${prebuild}`
      );
    requireFile(
      path.join(nativeRoot, 'Pods/Manifest.lock'),
      'Run pod install in the ios directory first.'
    );
    const workspace = workspaces[0];
    const listing = JSON.parse(
      execute('xcodebuild', ['-workspace', workspace, '-list', '-json'], true)
    ) as {
      workspace: { schemes: string[] };
    };
    const schemes = listing.workspace.schemes;
    const workspaceName = path.basename(workspace, '.xcworkspace');
    const scheme =
      options.scheme ??
      (schemes.includes(workspaceName)
        ? workspaceName
        : schemes.length === 1
          ? schemes[0]
          : undefined);
    if (!scheme || !schemes.includes(scheme))
      throw new Error('Choose an available iOS scheme with --scheme.');
    const buildArgs = [
      '-workspace',
      workspace,
      '-scheme',
      scheme,
      '-configuration',
      'Release',
      '-sdk',
      'iphonesimulator',
      '-destination',
      'generic/platform=iOS Simulator',
      '-derivedDataPath',
      path.join(nativeRoot, 'build/repack-release'),
      'CODE_SIGNING_ALLOWED=NO',
      `ARCHS=${process.arch === 'arm64' ? 'arm64' : 'x86_64'}`,
    ];
    const settings = JSON.parse(
      execute('xcodebuild', [...buildArgs, '-showBuildSettings', '-json'], true)
    ) as Array<{
      buildSettings: {
        PRODUCT_TYPE: string;
        TARGET_BUILD_DIR: string;
        FULL_PRODUCT_NAME: string;
      };
    }>;
    const apps = settings.filter(
      ({ buildSettings }) =>
        buildSettings.PRODUCT_TYPE === 'com.apple.product-type.application'
    );
    if (apps.length !== 1)
      throw new Error(
        'The selected scheme must build exactly one application.'
      );
    const { TARGET_BUILD_DIR, FULL_PRODUCT_NAME } = apps[0].buildSettings;
    if (!TARGET_BUILD_DIR || !FULL_PRODUCT_NAME)
      throw new Error('Xcode did not report the application output path.');
    binary = path.join(TARGET_BUILD_DIR, FULL_PRODUCT_NAME);
    execute('xcodebuild', [...buildArgs, 'build']);
  }
  requireFile(
    binary,
    'The native build did not produce the expected Release binary. Custom Android flavors or APK splits are not supported.'
  );
  if (expoCli) {
    execute(
      process.execPath,
      [
        expoCli,
        `run:${options.platform}`,
        ...(options.platform === 'ios'
          ? ['--configuration', 'Release']
          : ['--variant', 'release']),
        '--no-bundler',
        '--binary',
        binary,
        ...(options.scheme ? ['--scheme', options.scheme] : []),
        ...(options.device ? ['--device', options.device] : []),
      ],
      false,
      projectRoot
    );
  }
  return binary;
}
