import { type ResolveOptions, getResolveOptions } from '@callstack/repack';
import { type Resolver, ResolverFactory } from 'enhanced-resolve';
import type { VirtualFileSystem } from './virtual-fs.js';

export interface RepackResolverOptions extends ResolveOptions {
  platform?: string;
  fileSystem?: any;
}

export class RepackResolver {
  private resolvers: Map<string, Resolver> = new Map();
  private options: RepackResolverOptions;

  constructor(options: RepackResolverOptions = {}) {
    this.options = options;
  }

  private createResolver(dependencyType: 'esm' | 'commonjs'): Resolver {
    const platform = this.options.platform || 'ios';
    const resolveOptions = getResolveOptions(platform, {
      enablePackageExports: this.options.enablePackageExports,
      preferNativePlatform: this.options.preferNativePlatform,
    });

    // Enhanced-resolve doesn't support byDependency directly,
    // so we need to merge the dependency-specific options
    const dependencyOptions = resolveOptions.byDependency[dependencyType] || {};
    const mergedConditionNames = [
      ...resolveOptions.conditionNames,
      ...dependencyOptions.conditionNames,
    ];

    const enhancedResolveOptions = {
      mainFields: resolveOptions.mainFields,
      aliasFields: resolveOptions.aliasFields,
      conditionNames: mergedConditionNames,
      exportsFields: resolveOptions.exportsFields,
      extensions: resolveOptions.extensions,
      extensionAlias: resolveOptions.extensionAlias,
      fileSystem: this.options.fileSystem,
      // Enhanced-resolve specific options
      cache: false, // Disable caching for tests
      symlinks: false,
    };

    return ResolverFactory.createResolver(enhancedResolveOptions);
  }

  setFileSystem(vfs: VirtualFileSystem): void {
    this.options.fileSystem = vfs.getFileSystem();
    this.resolvers.clear();
  }

  getOrCreateResolver(dependencyType: 'esm' | 'commonjs' = 'esm'): Resolver {
    if (!this.resolvers.has(dependencyType)) {
      this.resolvers.set(dependencyType, this.createResolver(dependencyType));
    }
    return this.resolvers.get(dependencyType)!;
  }

  async resolveESM(context: string, request: string): Promise<string> {
    const resolver = this.getOrCreateResolver('esm');
    return new Promise((resolve, reject) => {
      resolver.resolve({}, context, request, {}, (err, result) => {
        return err ? reject(err) : resolve(result as string);
      });
    });
  }

  async resolveCommonJS(context: string, request: string): Promise<string> {
    const resolver = this.getOrCreateResolver('commonjs');
    return new Promise((resolve, reject) => {
      resolver.resolve({}, context, request, {}, (err, result) => {
        return err ? reject(err) : resolve(result as string);
      });
    });
  }
}
