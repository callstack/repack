import path from 'path';
import memfs from 'memfs';
import { getResolveOptions } from '@callstack/repack/dist/webpack/utils/getResolveOptions';
import type * as EnhancedResolveNS from 'enhanced-resolve';

type EnhancedResolve = typeof EnhancedResolveNS;
type EnhancedResolveOptions = EnhancedResolveNS.ResolveOptions;
type InputFileMap = Record<string, string | { realPath?: string }>;
type FileMap = Record<string, string>;
type SymlinksMap = Record<string, string>;

interface TransformedContext {
  context: string;
  inputFileMap: InputFileMap;
  options: Partial<EnhancedResolveOptions>;
}

interface ResolutionContext {
  assetExts: Set<string>;
  extraNodeModules: Record<string, string> | null;
  mainFields: string[];
  nodeModulesPaths: string[];
  preferNativePlatform: boolean;
  originModulePath?: string;
  sourceExts: string[];
  unstable_conditionNames: string[];
  unstable_conditionsByPlatform: Record<string, string[]>;
  unstable_enablePackageExports: boolean;
  unstable_enableSymlinks: boolean;
  // unsupported, but need to be handled
  allowHaste: boolean;
  resolveHasteModule: (name: string) => string | null;
  resolveHastePackage: (name: string) => string | null;
  // unsure
  dev: boolean;
  resolveAsset: (filePath: string) => null;
  unstable_logWarning: () => void;
  disableHierarchicalLookup: boolean;
  customResolverOptions: Record<string, any>;
  redirectModulePath: (filePath: string) => string;
  unstable_getRealPath?: ((filePath: string) => string) | null;
  doesFileExist: (filePath: string) => boolean;
  getPackage: (packageJsonPath: string) => Object;
  getPackageForModule: (modulePath: string) => Object;
  // mock additional fields
  __fileMap: InputFileMap;
  __options: { enableSymlinks?: boolean };
}

// shared filesystem for all tests
const filesystem = new memfs.Volume();

// divide input file map into file map and symlinks map
function processInputFileMap(inputFileMap: InputFileMap) {
  const fileMap: Record<string, string> = {};
  const symlinksMap: Record<string, string> = {};

  for (const [filePath, content] of Object.entries(inputFileMap)) {
    if (typeof content === 'string') {
      fileMap[filePath] = content;
    } else {
      symlinksMap[filePath] = String(content.realPath);
    }
  }

  return { fileMap, symlinksMap };
}

function setupFilesystemFromFileMap(
  fileMap: FileMap,
  symlinksMap: SymlinksMap
) {
  filesystem.reset();
  filesystem.fromJSON(fileMap, '/');
  for (const [link, target] of Object.entries(symlinksMap)) {
    filesystem.symlinkSync(target, link);
  }
}

// use internal enhanced-resolve
function getEnhancedResolvePath() {
  const repackPath = require.resolve('@callstack/repack');
  const webpackPath = require.resolve('webpack', { paths: [repackPath] });
  return require.resolve('enhanced-resolve', { paths: [webpackPath] });
}

// maps metro-resolver options to enhanced-resolve options
function transformContext(context: ResolutionContext): TransformedContext {
  return {
    // webpack provides context as a directory, not a file
    context: path.dirname(context.originModulePath!),
    inputFileMap: context.__fileMap,
    options: {
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
  const { context, inputFileMap, options } = transformContext(metroContext);
  const { fileMap, symlinksMap } = processInputFileMap(inputFileMap);

  setupFilesystemFromFileMap(fileMap, symlinksMap);

  const resolve = enhancedResolve.create.sync({
    // @ts-expect-error memfs is compatible enough
    fileSystem: filesystem,
    // apply Re.Pack defaults
    ...getResolveOptions(platform ?? 'platform'),
    // customize options for test purposes
    ...options,
  });

  // console.log('FINAL OPTIONS', context, request, platform, options);
  const resolvedPath = resolve(context, request);
  // adjust result to match metro-resolver output
  return {
    type: 'sourceFile',
    filePath: resolvedPath,
  };
}

export default { resolve };
