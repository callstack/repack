import memfs from 'memfs';
import { getResolveOptions } from '@callstack/repack';
import type * as EnhancedResolveNS from 'enhanced-resolve';
type InputFileMap = Record<string, string | { realPath?: string }>;
type FileMap = Record<string, string>;
type SymlinksMap = Record<string, string>;

type EnhancedResolve = typeof EnhancedResolveNS;
type EnhancedResolveOptions = EnhancedResolveNS.ResolveOptions;
interface TransformedContext {
  context: string;
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
    context: context.originModulePath!,
    options: {
      symlinks: context.unstable_enableSymlinks,
    },
  };
}

// mocked utils
export function createResolutionContext(
  inputFileMap: InputFileMap,
  options: { enableSymlinks?: boolean }
): ResolutionContext {
  const { fileMap, symlinksMap } = processInputFileMap(inputFileMap);
  // TODO determine if it's ok to set it up here;
  setupFilesystemFromFileMap(fileMap, symlinksMap);

  // return defaults
  return {
    dev: true,
    allowHaste: true,
    assetExts: new Set(['jpg', 'png']),
    customResolverOptions: {},
    disableHierarchicalLookup: false,
    extraNodeModules: null,
    mainFields: ['browser', 'main'],
    nodeModulesPaths: [],
    preferNativePlatform: false,
    redirectModulePath: (filePath: string) => filePath,
    resolveAsset: (_: string) => null,
    resolveHasteModule: (_: string) => null,
    resolveHastePackage: (_: string) => null,
    sourceExts: ['js', 'jsx', 'json', 'ts', 'tsx'],
    unstable_conditionNames: ['require'],
    unstable_conditionsByPlatform: { web: ['browser'] },
    unstable_enablePackageExports: false,
    unstable_logWarning: () => {},
    unstable_enableSymlinks: options.enableSymlinks ?? true,
    // let's see if we need this
    getPackage: () => ({}),
    getPackageForModule: () => ({}),
    doesFileExist: () => false,
  };
}

// mocked index
export function resolve(
  metroContext: ResolutionContext,
  request: string,
  platform: string
) {
  const enhancedResolve: EnhancedResolve = require(getEnhancedResolvePath());
  const { context, options } = transformContext(metroContext);

  const resolve = enhancedResolve.create.sync({
    // apply Re.Pack defaults
    ...getResolveOptions(platform),
    // customize options for test purposes
    ...options,
  });

  console.log(context, request, platform);
  return resolve(context, request);
}
