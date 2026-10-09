import { getResolveOptions } from '@callstack/repack';
import type { ResolveOptions } from '@rspack/core';

function mergeUnique(required: string[], current?: string[]): string[] {
  return [...new Set([...required, ...(current ?? [])])];
}

function mergeDependencyOptions(
  current: ResolveOptions['byDependency'],
  required: Record<string, { conditionNames: string[] }>
): NonNullable<ResolveOptions['byDependency']> {
  const merged = { ...current };

  for (const [dependency, options] of Object.entries(required)) {
    const currentOptions = current?.[dependency];
    merged[dependency] = {
      ...currentOptions,
      ...options,
      conditionNames: mergeUnique(
        options.conditionNames,
        currentOptions?.conditionNames
      ),
    };
  }

  return merged;
}

export function configureExpoResolveOptions(
  resolve: ResolveOptions,
  platform: 'android' | 'ios'
): void {
  const required = getResolveOptions(platform, {
    enablePackageExports: true,
  });

  resolve.aliasFields = mergeUnique(required.aliasFields, resolve.aliasFields);
  resolve.conditionNames = mergeUnique(
    required.conditionNames,
    resolve.conditionNames
  );
  resolve.exportsFields = mergeUnique(
    required.exportsFields,
    resolve.exportsFields
  );
  resolve.extensions = mergeUnique(required.extensions, resolve.extensions);
  resolve.mainFields = mergeUnique(required.mainFields, resolve.mainFields);
  resolve.extensionAlias = {
    ...required.extensionAlias,
    ...resolve.extensionAlias,
  };
  resolve.byDependency = mergeDependencyOptions(
    resolve.byDependency,
    required.byDependency
  );
}
