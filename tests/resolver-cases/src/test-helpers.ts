import fs from 'node:fs';
import path from 'node:path';
import { getResolveOptions } from '@callstack/repack';
import { ResolverFactory } from 'enhanced-resolve';
import { Volume } from 'memfs';

interface FixtureData {
  'package.json': Record<string, any>;
  files: string[];
}

// Load fixture data from JSON files
export function loadFixture(fixtureName: string): Record<string, string> {
  const fixtureDir = path.join(__dirname, '__fixtures__');
  const fixturePath = path.join(fixtureDir, `${fixtureName}.json`);

  const fixtureData: FixtureData = JSON.parse(
    fs.readFileSync(fixturePath, 'utf8')
  );

  const result: Record<string, string> = {
    'package.json': JSON.stringify(fixtureData['package.json']),
  };

  // Create empty files for each path in the files array
  for (const filePath of fixtureData.files) {
    result[filePath] = `// ${filePath}`;
  }

  return result;
}

// Simple function to create a package in the virtual filesystem
async function createPackage(
  volume: InstanceType<typeof Volume>,
  packagePath: string,
  files: Record<string, string>
): Promise<void> {
  const basePath = packagePath.endsWith('/') ? packagePath : `${packagePath}/`;

  // Ensure the package directory exists
  await volume.promises.mkdir(basePath, { recursive: true });

  // Create all files (including package.json)
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = `${basePath}${filePath}`;
    const dirPath = fullPath.substring(0, fullPath.lastIndexOf('/'));

    // Create intermediate directories if needed
    if (dirPath !== basePath.slice(0, -1)) {
      await volume.promises.mkdir(dirPath, { recursive: true });
    }

    await volume.promises.writeFile(fullPath, content);
  }
}

// Helper function to resolve modules using the configured resolvers
function createResolveFunction(esmResolver: any, cjsResolver: any) {
  return async function resolve(
    request: string,
    context = '/app',
    dependencyType: 'esm' | 'commonjs' = 'esm'
  ): Promise<string | null> {
    const resolver = dependencyType === 'esm' ? esmResolver : cjsResolver;
    try {
      const result = await new Promise<string>((resolve, reject) => {
        resolver.resolve({}, context, request, {}, (err: any, result: any) => {
          err ? reject(err) : resolve(result as string);
        });
      });
      return result;
    } catch {
      return null;
    }
  };
}

// Helper function to list all files in the virtual filesystem
function createListFilesFunction(volume: InstanceType<typeof Volume>) {
  return function listFiles(): string[] {
    const files: string[] = [];
    function walk(dir: string): void {
      try {
        const items = volume.readdirSync(dir) as string[];
        for (const item of items) {
          const fullPath = `${dir}/${item}`;
          const stat = volume.statSync(fullPath);
          if (stat.isDirectory()) {
            walk(fullPath);
          } else {
            files.push(fullPath);
          }
        }
      } catch {
        // Ignore errors
      }
    }
    walk('/');
    return files;
  };
}

// Helper function to create resolvers with Repack options
function createResolvers(
  volume: InstanceType<typeof Volume>,
  platform: string,
  options: {
    enablePackageExports?: boolean;
    preferNativePlatform?: boolean;
  } = {}
) {
  // Get resolve options from Repack
  const resolveOptions = getResolveOptions(platform, {
    enablePackageExports: options.enablePackageExports,
    preferNativePlatform: options.preferNativePlatform,
  });

  // Create resolvers for both ESM and CommonJS
  const createResolver = (dependencyType: 'esm' | 'commonjs') => {
    const specificConditionNames =
      resolveOptions.byDependency[dependencyType].conditionNames;

    return ResolverFactory.createResolver({
      mainFields: resolveOptions.mainFields,
      aliasFields: resolveOptions.aliasFields,
      conditionNames: specificConditionNames ?? resolveOptions.conditionNames,
      exportsFields: resolveOptions.exportsFields,
      extensions: resolveOptions.extensions,
      extensionAlias: resolveOptions.extensionAlias,
      fileSystem: volume as any, // Cast to any to work around enhanced-resolve types
      symlinks: false,
    });
  };

  return {
    esm: createResolver('esm'),
    cjs: createResolver('commonjs'),
  };
}

// Main setup function - creates filesystem and resolver
export async function setupTestEnvironment(
  packages: Record<string, Record<string, string>>,
  options: {
    platform?: string;
    enablePackageExports?: boolean;
    preferNativePlatform?: boolean;
  } = {}
) {
  const volume = new Volume();
  const platform = options.platform || 'ios';

  // Ensure node_modules directory exists first
  await volume.promises.mkdir('/node_modules', { recursive: true });

  // Create all packages in node_modules
  for (const [packageName, files] of Object.entries(packages)) {
    await createPackage(volume, `/node_modules/${packageName}`, files);
  }

  // Create resolvers using the helper function
  const resolvers = createResolvers(volume, platform, options);

  return {
    resolve: createResolveFunction(resolvers.esm, resolvers.cjs),
    listFiles: createListFilesFunction(volume),
  };
}
