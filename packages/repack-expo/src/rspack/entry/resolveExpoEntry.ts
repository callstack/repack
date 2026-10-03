import fs from 'node:fs';
import path from 'node:path';
import { ExpoEntryResolutionError } from './ExpoEntryResolutionError.js';

export type ExpoNativePlatform = 'android' | 'ios';

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  main?: unknown;
  name?: string;
  peerDependencies?: Record<string, string>;
};

export type ResolveExpoEntryOptions = {
  entry?: string;
  from?: string;
  platform: ExpoNativePlatform;
  projectRoot?: string;
};

export type ResolvedExpoEntry = Readonly<{
  entryPath: string;
  packageName?: string;
  physicalProjectRoot: string;
  platform: ExpoNativePlatform;
  projectRoot: string;
  request: string;
}>;

const PROJECT_MARKERS = ['app.json', 'app.config.js', 'app.config.ts'];
const METRO_VIRTUAL_ENTRY = '.expo/.virtual-metro-entry';
const SOURCE_EXTENSIONS = ['tsx', 'ts', 'jsx', 'js', 'json'];

function readPackageJson(projectRoot: string): PackageJson {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  let contents: string;

  try {
    contents = fs.readFileSync(packageJsonPath, 'utf8');
  } catch {
    throw new ExpoEntryResolutionError({
      code: 'EXPO_PROJECT_NOT_FOUND',
      message: `No package.json was found for the Expo project at ${projectRoot}.`,
      projectRoot,
      recovery:
        'Run the command from an Expo application or pass its project root explicitly.',
    });
  }

  try {
    const packageJson: unknown = JSON.parse(contents);
    if (
      packageJson === null ||
      typeof packageJson !== 'object' ||
      Array.isArray(packageJson)
    ) {
      throw new Error('package.json must contain an object');
    }
    return packageJson as PackageJson;
  } catch {
    throw new ExpoEntryResolutionError({
      code: 'INVALID_PACKAGE_JSON',
      message: `The package.json at ${packageJsonPath} is not valid JSON.`,
      projectRoot,
      recovery: 'Fix package.json before configuring Re.Pack for Expo.',
    });
  }
}

function isExpoPackage(packageJson: PackageJson): boolean {
  return Boolean(
    packageJson.dependencies?.expo ??
      packageJson.devDependencies?.expo ??
      packageJson.peerDependencies?.expo
  );
}

function hasExpoProjectMarker(directory: string): boolean {
  return PROJECT_MARKERS.some((marker) =>
    fs.existsSync(path.join(directory, marker))
  );
}

function normalizeStartDirectory(from: string): string {
  const absoluteFrom = path.resolve(from);
  try {
    return fs.statSync(absoluteFrom).isDirectory()
      ? absoluteFrom
      : path.dirname(absoluteFrom);
  } catch {
    return absoluteFrom;
  }
}

export function findExpoProjectRoot(from: string): string {
  let current = normalizeStartDirectory(from);

  while (true) {
    const packageJsonPath = path.join(current, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = readPackageJson(current);
      if (isExpoPackage(packageJson) || hasExpoProjectMarker(current)) {
        return current;
      }
    }

    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  throw new ExpoEntryResolutionError({
    code: 'EXPO_PROJECT_NOT_FOUND',
    message: `No Expo project could be found from ${path.resolve(from)}.`,
    recovery:
      'Run the command inside a package that depends on expo or pass its project root explicitly.',
  });
}

function platformExtensions(platform: ExpoNativePlatform): string[] {
  return SOURCE_EXTENSIONS.flatMap((extension) => [
    `.${platform}.${extension}`,
    `.native.${extension}`,
    `.${extension}`,
  ]);
}

function resolveFileRequest(
  projectRoot: string,
  request: string,
  platform: ExpoNativePlatform
): string | undefined {
  const basePath = path.isAbsolute(request)
    ? request
    : path.resolve(projectRoot, request);
  const candidates = path.extname(basePath)
    ? [basePath]
    : [
        ...platformExtensions(platform).map(
          (extension) => `${basePath}${extension}`
        ),
        ...platformExtensions(platform).map((extension) =>
          path.join(basePath, `index${extension}`)
        ),
      ];

  return candidates.find((candidate) => {
    try {
      return fs.statSync(candidate).isFile();
    } catch {
      return false;
    }
  });
}

function resolveEntryRequest(
  projectRoot: string,
  request: string,
  platform: ExpoNativePlatform
): string | undefined {
  const fileRequest = resolveFileRequest(projectRoot, request, platform);
  if (fileRequest) return fileRequest;

  try {
    return require.resolve(request, { paths: [projectRoot] });
  } catch {
    return undefined;
  }
}

function rejectMetroVirtualEntry(
  projectRoot: string,
  request: string,
  platform: ExpoNativePlatform
): void {
  if (!request.replaceAll('\\', '/').includes(METRO_VIRTUAL_ENTRY)) return;

  throw new ExpoEntryResolutionError({
    code: 'METRO_ENTRY_UNSUPPORTED',
    message: `The entry ${request} is an Expo Metro virtual entry and cannot be compiled by Re.Pack.`,
    platform,
    projectRoot,
    requestedEntry: request,
    recovery:
      'Set package.json#main to the real application entry, such as expo-router/entry or index.js.',
  });
}

export function resolveExpoEntry(
  options: ResolveExpoEntryOptions
): ResolvedExpoEntry {
  if (options.platform !== 'android' && options.platform !== 'ios') {
    throw new ExpoEntryResolutionError({
      code: 'UNSUPPORTED_PLATFORM',
      message: `Expo/Re.Pack v1 does not support platform ${String(options.platform)}.`,
      platform: options.platform,
      recovery: 'Use the ios or android native platform.',
    });
  }

  const projectRoot = options.projectRoot
    ? path.resolve(options.projectRoot)
    : findExpoProjectRoot(options.from ?? process.cwd());
  const packageJson = readPackageJson(projectRoot);
  if (!isExpoPackage(packageJson) && !hasExpoProjectMarker(projectRoot)) {
    throw new ExpoEntryResolutionError({
      code: 'EXPO_PROJECT_NOT_FOUND',
      message: `The package at ${projectRoot} is not configured as an Expo project.`,
      projectRoot,
      recovery:
        'Install expo in the application package or pass the correct Expo project root.',
    });
  }
  const request = options.entry ?? packageJson.main;

  if (typeof request !== 'string' || request.length === 0) {
    throw new ExpoEntryResolutionError({
      code: 'ENTRY_NOT_DEFINED',
      message: `The Expo project at ${projectRoot} does not define package.json#main.`,
      platform: options.platform,
      projectRoot,
      recovery:
        'Set package.json#main to expo-router/entry or an application entry such as index.js.',
    });
  }

  rejectMetroVirtualEntry(projectRoot, request, options.platform);
  const entryPath = resolveEntryRequest(projectRoot, request, options.platform);
  if (!entryPath) {
    throw new ExpoEntryResolutionError({
      code: 'ENTRY_NOT_FOUND',
      message: `Cannot resolve Expo entry ${request} for ${options.platform} from ${projectRoot}.`,
      platform: options.platform,
      projectRoot,
      requestedEntry: request,
      recovery:
        'Install the entry package or correct package.json#main before running Re.Pack.',
    });
  }

  return Object.freeze({
    entryPath: fs.realpathSync(entryPath),
    packageName: packageJson.name,
    physicalProjectRoot: fs.realpathSync(projectRoot),
    platform: options.platform,
    projectRoot,
    request,
  });
}
