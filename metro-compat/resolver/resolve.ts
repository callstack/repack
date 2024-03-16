import memfs from 'memfs';

type FileMap = Record<string, string | { realPath?: string }>;

interface ResolutionContext {
  assetExts: Set<string>;
  extraNodeModules: Record<string, string>;
  mainFields: string[];
  nodeModulesPaths: string[];
  preferNativePlatform: boolean;
  sourceExts: string[];
  unstable_conditionNames: string[];
  unstable_conditionsByPlatform: Record<string, string[]>;
  unstable_enablePackageExports: boolean;
  // unsupported, but need to be handled
  allowHaste: boolean;
  resolveHasteModule: (name: string) => string | null;
  resolveHastePackage: (name: string) => string | null;
  // unsure
  dev: boolean;
  resolveAsset: (filePath: string) => null;
  unstable_logWarning: () => {};
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

function setupFilesystemFromFileMap(fileMap: FileMap) {
  filesystem.reset();
}

// mocked utils
export function createResolutionContext(
  fileMap: FileMap,
  options: { enableSymlinks?: boolean }
) {
  console.log('createResolutionContext');
}

// mocked index
export function resolve(context: ResolutionContext, request, platform) {
  setupFilesystemFromFileMap(context.fileMap);
  console.log(context, request, platform);
  return '';
}
