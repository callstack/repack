import { RepackResolver, type RepackResolverOptions } from './resolver.js';
import { VirtualFileSystem, type VirtualPackage } from './virtual-fs.js';

/**
 * Test context for resolver tests
 */
export interface ResolverTestContext {
  vfs: VirtualFileSystem;
  resolver: RepackResolver;
  nodeModulesPath: string;
}

/**
 * Creates a test context with virtual filesystem and resolver
 */
export function createResolverTestContext(
  options: RepackResolverOptions = {}
): ResolverTestContext {
  const vfs = new VirtualFileSystem();
  const resolver = new RepackResolver(options);
  resolver.setFileSystem(vfs);

  return {
    vfs,
    resolver,
    nodeModulesPath: '/node_modules',
  };
}

/**
 * Sets up a test environment with packages
 */
export async function setupTestEnvironment(
  packages: Array<{ name: string; package: VirtualPackage }>,
  options: RepackResolverOptions = {}
): Promise<ResolverTestContext> {
  const context = createResolverTestContext(options);

  // Create all packages in node_modules
  const packagePromises = packages.map(({ name, package: pkg }) =>
    context.vfs.createPackage(`${context.nodeModulesPath}/${name}`, pkg)
  );

  await Promise.all(packagePromises);

  return context;
}

/**
 * Helper to create a minimal test app structure
 */
export async function createTestApp(
  context: ResolverTestContext,
  appFiles: Record<string, string> = {}
): Promise<void> {
  // Create app directory
  await context.vfs.createPackage('/app', {
    name: 'test-app',
    version: '1.0.0',
    packageJson: {
      name: 'test-app',
      version: '1.0.0',
      main: './index.js',
    },
    files: {
      'index.js': 'console.log("Hello, world!");',
      ...appFiles,
    },
  });
}

/**
 * Helper for testing resolution from app context
 */
export async function resolveFromApp(
  context: ResolverTestContext,
  request: string,
  dependencyType: 'esm' | 'commonjs' = 'esm'
): Promise<string | null> {
  const appContext = '/app';

  if (dependencyType === 'esm') {
    return context.resolver.resolveESM(appContext, request);
  }
  return context.resolver.resolveCommonJS(appContext, request);
}

/**
 * Helper to debug resolution by listing all files
 */
export function debugVirtualFs(context: ResolverTestContext): void {
  console.log('Virtual filesystem contents:');
  const files = context.vfs.listFiles();
  files.forEach((file) => console.log(`  ${file}`));
}
