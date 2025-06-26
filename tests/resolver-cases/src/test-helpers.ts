import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { type ResolveOptions, getResolveOptions } from '@callstack/repack';
import { ResolverFactory } from 'enhanced-resolve';
import { Volume } from 'memfs';

export interface TestOptions extends ResolveOptions {
  platform?: string;
}

interface FixtureData {
  'package.json': Record<string, any>;
  files: Record<string, string>;
}

// Load fixture data from JSON files
export function loadFixture(fixtureName: string): Record<string, string> {
  const fixturePath = join(__dirname, '__fixtures__', `${fixtureName}.json`);
  const fixtureData: FixtureData = JSON.parse(
    readFileSync(fixturePath, 'utf8')
  );

  return {
    'package.json': JSON.stringify(fixtureData['package.json']),
    ...fixtureData.files,
  };
}

// Load multiple fixtures
export function loadFixtures(
  fixtures: Record<string, string>
): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};

  for (const [packageName, fixtureName] of Object.entries(fixtures)) {
    result[packageName] = loadFixture(fixtureName);
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

// Main setup function - creates filesystem and resolver
export async function setupTestEnvironment(
  packages: Record<string, Record<string, string>>,
  options: TestOptions = {}
) {
  const volume = new Volume();
  const platform = options.platform || 'ios';

  // Ensure node_modules directory exists first
  await volume.promises.mkdir('/node_modules', { recursive: true });

  // Create all packages in node_modules
  for (const [packageName, files] of Object.entries(packages)) {
    await createPackage(volume, `/node_modules/${packageName}`, files);
  }

  // Get resolve options from Repack
  const resolveOptions = getResolveOptions(platform, {
    enablePackageExports: options.enablePackageExports,
    preferNativePlatform: options.preferNativePlatform,
  });

  // Create resolvers for both ESM and CommonJS
  const createResolver = (dependencyType: 'esm' | 'commonjs') => {
    const dependencyOptions = resolveOptions.byDependency[dependencyType] || {};
    const mergedConditionNames = [
      ...resolveOptions.conditionNames,
      ...dependencyOptions.conditionNames,
    ];

    return ResolverFactory.createResolver({
      mainFields: resolveOptions.mainFields,
      aliasFields: resolveOptions.aliasFields,
      conditionNames: mergedConditionNames,
      exportsFields: resolveOptions.exportsFields,
      extensions: resolveOptions.extensions,
      extensionAlias: resolveOptions.extensionAlias,
      fileSystem: volume as any, // Cast to any to work around enhanced-resolve types
      symlinks: false,
    });
  };

  const esmResolver = createResolver('esm');
  const cjsResolver = createResolver('commonjs');

  return {
    volume,
    // Simple resolve function - most tests just need this
    async resolve(
      request: string,
      context = '/app',
      dependencyType: 'esm' | 'commonjs' = 'esm'
    ): Promise<string | null> {
      const resolver = dependencyType === 'esm' ? esmResolver : cjsResolver;
      try {
        const result = await new Promise<string>((resolve, reject) => {
          resolver.resolve({}, context, request, {}, (err, result) => {
            err ? reject(err) : resolve(result as string);
          });
        });
        return result;
      } catch {
        return null;
      }
    },
    // Debug helper
    listFiles(): string[] {
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
    },
  };
}
