import path from 'node:path';
import { getResolveOptions } from '@callstack/repack';
import type * as EnhancedResolveNS from 'enhanced-resolve';
import memfs from 'memfs';
import type { PackageJson } from 'type-fest';

type EnhancedResolve = typeof EnhancedResolveNS;
type EnhancedResolveOptions = EnhancedResolveNS.ResolveOptions;
type FileMap = Record<string, string>;
type SymlinksMap = Record<string, string | null>;
type InputFileMap =
  | Record<string, string | { realPath?: string }>
  | Record<string, PackageJson>;

interface TransformedContext {
  context: string;
  inputFileMap: InputFileMap;
  options: Partial<EnhancedResolveOptions>;
}

interface ResolutionContext {
  mainFields: string[];
  preferNativePlatform: boolean;
  originModulePath?: string;
  sourceExts: string[];
  unstable_conditionNames: string[];
  unstable_conditionsByPlatform: Record<string, string[]>;
  unstable_enablePackageExports: boolean;
  unstable_enableSymlinks: boolean;
  // unsupported or ignored
  allowHaste: boolean;
  isESMImport: boolean;
  assetExts: Set<string>;
  customResolverOptions: Record<string, any>;
  dev: boolean;
  disableHierarchicalLookup: boolean;
  doesFileExist: (filePath: string) => boolean;
  extraNodeModules: Record<string, string> | null;
  getPackage: (packageJsonPath: string) => Object;
  getPackageForModule: (modulePath: string) => Object;
  nodeModulesPaths: string[];
  redirectModulePath?: (filePath: string) => string;
  resolveAsset: (filePath: string) => null;
  resolveHasteModule: (name: string) => string | null;
  resolveHastePackage: (name: string) => string | null;
  unstable_getRealPath?: ((filePath: string) => string) | null;
  unstable_logWarning: () => void;
  // mock additional fields
  __fileMap: InputFileMap;
  __fileMapOverrides: InputFileMap;
  __options: { enableSymlinks?: boolean };
}

// divide input file map into file map and symlinks map
function processInputFileMap(inputFileMap: InputFileMap) {
  const fileMap: FileMap = {};
  const symlinksMap: SymlinksMap = {};

  for (const [filePath, content] of Object.entries(inputFileMap)) {
    if (typeof content === 'string') {
      fileMap[filePath] = content;
    } else if (content && 'realPath' in content) {
      symlinksMap[filePath] = content.realPath;
    } else {
      const packageJson = content as PackageJson;
      fileMap[filePath] = JSON.stringify(packageJson);
    }
  }

  return { fileMap, symlinksMap };
}

function createFilesystem(fileMap: FileMap, symlinksMap: SymlinksMap) {
  const filesystem = memfs.Volume.fromJSON(fileMap, '/');
  for (const [link, target] of Object.entries(symlinksMap)) {
    if (target && !filesystem.existsSync(target)) {
      filesystem.writeFileSync(target, '');
    }
    filesystem.symlinkSync(target ?? '', link);
  }
  return filesystem;
}

// use internal enhanced-resolve
function getEnhancedResolvePath() {
  const repackPath = require.resolve('@callstack/repack');
  const webpackPath = require.resolve('webpack', { paths: [repackPath] });
  return require.resolve('enhanced-resolve', { paths: [webpackPath] });
}

// maps metro-resolver options to enhanced-resolve options
function transformContext(
  context: ResolutionContext,
  platform: string | null
): TransformedContext {
  return {
    // webpack provides context as a directory, not a file
    context: path.dirname(context.originModulePath!),
    inputFileMap: {
      ...context.__fileMap,
      ...context.__fileMapOverrides,
    } as InputFileMap,
    options: {
      // repack uses whole separate config per platform
      conditionNames: Array.from(
        new Set([
          ...context.unstable_conditionNames,
          ...(context.unstable_conditionsByPlatform[platform!] ?? []),
        ])
      ),
      fallback: context.extraNodeModules
        ? { ...context.extraNodeModules }
        : undefined,
      mainFields: context.mainFields,
      // symlinks are enabled by default in metro
      symlinks: context.__options?.enableSymlinks ?? true,
    },
  };
}

// mocked index
export function resolve(
  metroContext: ResolutionContext,
  request: string,
  platform: string | null
) {
  const enhancedResolve: EnhancedResolve = require(getEnhancedResolvePath());
  const { context, inputFileMap, options } = transformContext(
    metroContext,
    platform
  );
  const { fileMap, symlinksMap } = processInputFileMap(inputFileMap);
  const filesystem = createFilesystem(fileMap, symlinksMap);

  const resolutionPreset = getResolveOptions(String(platform), {
    enablePackageExports: metroContext.unstable_enablePackageExports,
    preferNativePlatform: metroContext.preferNativePlatform,
  });

  const resolveOptions: EnhancedResolveOptions = {
    // @ts-expect-error memfs is compatible enough
    fileSystem: filesystem,
    // apply Re.Pack defaults
    ...resolutionPreset,
    // customize options for test purposes
    ...options,
  };

  // this is equivalent to "byDependency" configuration in rspack/webpack
  // enhanced-resolve does not use "byDependency" configuration
  if (metroContext.isESMImport) {
    resolveOptions.conditionNames?.push(
      ...resolutionPreset.byDependency.esm.conditionNames
    );
  } else {
    resolveOptions.conditionNames?.push(
      ...resolutionPreset.byDependency.commonjs.conditionNames
    );
  }

  const resolve = enhancedResolve.create.sync(resolveOptions);
  const resolvedPath = resolve(context, request);

  // adjust result to match metro-resolver output
  return {
    type: 'sourceFile',
    filePath: resolvedPath,
  };
}

export default { resolve };
