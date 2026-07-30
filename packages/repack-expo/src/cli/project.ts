import fs from 'node:fs';
import path from 'node:path';
import type {
  ConfigPluginRegistration,
  Diagnostic,
  JsonObject,
  PackageJson,
  PackageManager,
} from './types.js';

export const CONFIG_PLUGIN = '@callstack/repack-expo';
export const RSPACK_COMMANDS = '@callstack/repack/commands/rspack';
export const RSPACK_CONFIG_NAMES = [
  'rspack.config.mts',
  'rspack.config.cts',
  'rspack.config.ts',
  'rspack.config.mjs',
  'rspack.config.cjs',
  'rspack.config.js',
] as const;
export const REQUIRED_DEV_DEPENDENCIES = [
  '@callstack/repack',
  '@callstack/repack-expo',
  '@react-native-community/cli',
  '@rspack/core',
] as const;
export const REQUIRED_SCRIPTS = {
  'repack:start': 'react-native webpack-start',
  'repack:ios': 'expo run:ios --no-bundler',
  'repack:android': 'expo run:android --no-bundler',
} as const;

export function diagnosticError(
  code: string,
  message: string,
  recovery: string
): Diagnostic {
  return { code, message, recovery, severity: 'error' };
}

export function diagnosticWarning(
  code: string,
  message: string,
  recovery?: string
): Diagnostic {
  return { code, message, recovery, severity: 'warning' };
}

export function readJson(filePath: string): JsonObject {
  const value: unknown = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${path.basename(filePath)} must contain a JSON object.`);
  }
  return value as JsonObject;
}

export function stringifyJson(value: JsonObject, original: string): string {
  const indentMatch = original.match(/\n([ \t]+)\S/);
  const indent = indentMatch?.[1] ?? '  ';
  const trailingNewline = original.endsWith('\n') ? '\n' : '';
  return `${JSON.stringify(value, null, indent)}${trailingNewline}`;
}

export function hasDependency(packageJson: PackageJson, name: string): boolean {
  return Boolean(
    packageJson.dependencies?.[name] ?? packageJson.devDependencies?.[name]
  );
}

export function detectPackageManager(
  projectRoot: string,
  packageJson?: PackageJson
): PackageManager {
  const lockfiles: Array<[string, PackageManager]> = [
    ['pnpm-lock.yaml', 'pnpm'],
    ['yarn.lock', 'yarn'],
    ['bun.lock', 'bun'],
    ['bun.lockb', 'bun'],
    ['package-lock.json', 'npm'],
    ['npm-shrinkwrap.json', 'npm'],
  ];
  let current = path.resolve(projectRoot);
  while (true) {
    let currentPackageJson =
      current === path.resolve(projectRoot) ? packageJson : undefined;
    const packagePath = path.join(current, 'package.json');
    if (!currentPackageJson && fs.existsSync(packagePath)) {
      try {
        currentPackageJson = readJson(packagePath);
      } catch {
        currentPackageJson = undefined;
      }
    }
    const declared = currentPackageJson?.packageManager;
    const name =
      typeof declared === 'string' ? declared.split('@')[0] : undefined;
    if (
      name === 'npm' ||
      name === 'yarn' ||
      name === 'pnpm' ||
      name === 'bun'
    ) {
      return name;
    }
    const locked = lockfiles.find(([lockfile]) =>
      fs.existsSync(path.join(current, lockfile))
    )?.[1];
    if (locked) return locked;

    const parent = path.dirname(current);
    if (
      parent === current ||
      fs.existsSync(path.join(current, '.git')) ||
      fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))
    ) {
      break;
    }
    current = parent;
  }
  return 'npm';
}

export function getConfigPluginRegistration(
  expo: JsonObject
): ConfigPluginRegistration {
  if (expo.plugins === undefined) {
    return { options: {}, registered: false };
  }
  if (!Array.isArray(expo.plugins)) {
    return {
      invalidReason: 'Expo config plugins must be an array.',
      options: {},
      registered: false,
    };
  }
  const matches = expo.plugins.filter(
    (plugin) =>
      plugin === CONFIG_PLUGIN ||
      (Array.isArray(plugin) && plugin[0] === CONFIG_PLUGIN)
  );
  if (matches.length === 0) return { options: {}, registered: false };
  if (matches.length > 1) {
    return {
      invalidReason: `${CONFIG_PLUGIN} is registered more than once.`,
      options: {},
      registered: true,
    };
  }
  const match = matches[0];
  if (match === CONFIG_PLUGIN) return { options: {}, registered: true };
  const rawOptions = (match as unknown[])[1];
  if (rawOptions === undefined) return { options: {}, registered: true };
  if (
    !rawOptions ||
    typeof rawOptions !== 'object' ||
    Array.isArray(rawOptions)
  ) {
    return {
      invalidReason: `${CONFIG_PLUGIN} options must be an object.`,
      options: {},
      registered: true,
    };
  }
  const options = rawOptions as JsonObject;
  for (const name of ['entry', 'configPath'] as const) {
    const value = options[name];
    if (
      value !== undefined &&
      (typeof value !== 'string' ||
        value.length === 0 ||
        /[\r\n\0]/.test(value))
    ) {
      return {
        invalidReason: `${CONFIG_PLUGIN} option ${name} must be a non-empty single-line string.`,
        options: {},
        registered: true,
      };
    }
  }
  return {
    options: {
      configPath: options.configPath as string | undefined,
      entry: options.entry as string | undefined,
    },
    registered: true,
  };
}

export function installCommand(packageManager: PackageManager): string {
  return packageManager === 'yarn'
    ? 'yarn install'
    : `${packageManager} install`;
}

function packageMetadata(): {
  peerDependencies?: Record<string, string>;
  version?: string;
} {
  try {
    return readJson(path.resolve(__dirname, '../../package.json'));
  } catch {
    return {};
  }
}

function normalizePublishRange(
  name: string,
  range: string
): string | undefined {
  if (!range.startsWith('workspace:')) return range;
  try {
    const sibling = readJson(
      path.resolve(__dirname, `../../../${name.split('/').at(-1)}/package.json`)
    );
    const version = sibling.version;
    if (typeof version !== 'string') return undefined;
    return range === 'workspace:^' ? `^${version}` : version;
  } catch {
    return undefined;
  }
}

export function dependencyRanges(): Record<string, string> {
  const metadata = packageMetadata();
  const ranges: Record<string, string> = {};
  if (metadata.version) ranges[CONFIG_PLUGIN] = metadata.version;
  for (const name of ['@callstack/repack', '@rspack/core']) {
    const range = metadata.peerDependencies?.[name];
    if (range) {
      const normalized = normalizePublishRange(name, range);
      if (normalized) ranges[name] = normalized;
    }
  }
  return ranges;
}

export function addDependencyCommand(
  packageManager: PackageManager,
  dependencies: string[]
): string {
  if (dependencies.length === 0) return installCommand(packageManager);
  const names = dependencies.join(' ');
  if (packageManager === 'npm') return `npm install --save-dev ${names}`;
  if (packageManager === 'yarn') return `yarn add --dev ${names}`;
  if (packageManager === 'bun') return `bun add --dev ${names}`;
  return `pnpm add --save-dev ${names}`;
}

export function dynamicExpoConfig(projectRoot: string): string | undefined {
  return [
    'app.config.ts',
    'app.config.js',
    'app.config.mjs',
    'app.config.cjs',
  ].find((name) => fs.existsSync(path.join(projectRoot, name)));
}

export function findFiles(
  directory: string,
  predicate: (filePath: string) => boolean
): string[] {
  if (!fs.existsSync(directory)) return [];
  const files: string[] = [];
  const pending = [directory];
  while (pending.length > 0) {
    const current = pending.pop() as string;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === 'Pods' || entry.name === 'build') continue;
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(entryPath);
      else if (predicate(entryPath)) files.push(entryPath);
    }
  }
  return files;
}

export function filesContain(files: string[], pattern: RegExp): boolean {
  return files.some((filePath) =>
    pattern.test(fs.readFileSync(filePath, 'utf8'))
  );
}

export function writeFilesAtomically(
  projectRoot: string,
  files: ReadonlyMap<string, string>,
  relativePaths: string[]
): void {
  const transactionId = `${process.pid}-${Date.now()}`;
  const createdDirectories: string[] = [];
  const staged: Array<{
    backupPath: string;
    existed: boolean;
    targetPath: string;
    temporaryPath: string;
  }> = [];
  try {
    for (const relativePath of relativePaths) {
      const targetPath = path.join(projectRoot, relativePath);
      const temporaryPath = `${targetPath}.repack-expo-${transactionId}.tmp`;
      const backupPath = `${targetPath}.repack-expo-${transactionId}.bak`;
      let directory = path.dirname(targetPath);
      const missingDirectories: string[] = [];
      while (!fs.existsSync(directory) && directory !== projectRoot) {
        missingDirectories.push(directory);
        directory = path.dirname(directory);
      }
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      createdDirectories.push(...missingDirectories);
      fs.writeFileSync(temporaryPath, files.get(relativePath) as string);
      const existed = fs.existsSync(targetPath);
      if (existed) fs.chmodSync(temporaryPath, fs.statSync(targetPath).mode);
      staged.push({ backupPath, existed, targetPath, temporaryPath });
    }

    for (const item of staged) {
      if (item.existed) fs.renameSync(item.targetPath, item.backupPath);
      fs.renameSync(item.temporaryPath, item.targetPath);
    }
    for (const item of staged) {
      if (item.existed && fs.existsSync(item.backupPath)) {
        fs.unlinkSync(item.backupPath);
      }
    }
  } catch (cause) {
    for (const item of [...staged].reverse()) {
      if (fs.existsSync(item.temporaryPath)) fs.unlinkSync(item.temporaryPath);
      if (fs.existsSync(item.backupPath)) {
        if (fs.existsSync(item.targetPath)) fs.unlinkSync(item.targetPath);
        fs.renameSync(item.backupPath, item.targetPath);
      } else if (!item.existed && fs.existsSync(item.targetPath)) {
        fs.unlinkSync(item.targetPath);
      }
    }
    for (const directory of createdDirectories) {
      try {
        fs.rmdirSync(directory);
      } catch {
        // Keep non-empty directories: their contents are not owned by init.
      }
    }
    throw cause;
  }
}
