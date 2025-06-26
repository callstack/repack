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

  /**
   * Creates a resolver for a specific dependency type (esm/commonjs)
   */
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

  /**
   * Get resolver for a specific dependency type
   */
  getResolver(dependencyType: 'esm' | 'commonjs' = 'esm'): Resolver {
    if (!this.resolvers.has(dependencyType)) {
      this.resolvers.set(dependencyType, this.createResolver(dependencyType));
    }
    return this.resolvers.get(dependencyType)!;
  }

  /**
   * Resolve a module with ESM semantics
   */
  async resolveESM(context: string, request: string): Promise<string | null> {
    const resolver = this.getResolver('esm');
    return new Promise((resolve, reject) => {
      resolver.resolve({}, context, request, {}, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result as string);
        }
      });
    });
  }

  /**
   * Resolve a module with CommonJS semantics
   */
  async resolveCommonJS(
    context: string,
    request: string
  ): Promise<string | null> {
    const resolver = this.getResolver('commonjs');
    return new Promise((resolve, reject) => {
      resolver.resolve({}, context, request, {}, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result as string);
        }
      });
    });
  }

  /**
   * Update the resolver options (useful for testing different configurations)
   */
  updateOptions(newOptions: Partial<RepackResolverOptions>): void {
    this.options = { ...this.options, ...newOptions };
    // Clear cached resolvers so they get recreated with new options
    this.resolvers.clear();
  }

  /**
   * Set a virtual file system for testing
   */
  setFileSystem(vfs: VirtualFileSystem): void {
    this.options.fileSystem = vfs.getFileSystem();
    this.resolvers.clear();
  }
}
