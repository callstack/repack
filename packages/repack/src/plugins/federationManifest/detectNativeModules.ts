import fs from 'node:fs';
import path from 'node:path';
import type { FederationNativeModule } from './types.js';

interface NativePackageInfo {
  pkgJsonPath: string;
  pkgDir: string;
}

const NODE_MODULES_SEGMENT = /(^|[/\\])node_modules[/\\]/;

interface DetectionResult {
  nativeModules: FederationNativeModule[];
  dynamicImportDetected: boolean;
  /** True when the scan itself failed and the list is not trustworthy. */
  degraded: boolean;
}

/**
 * Scan the compilation module graph for packages that ship native code.
 *
 * Every module whose `resource` lives inside a `node_modules` directory is
 * mapped to its owning package, and each package is classified with a
 * heuristic: a package is "native" when it has an `ios/` or `android/`
 * directory, a `codegenConfig`, a `react-native.config.js`, or the
 * `react-native` keyword.
 *
 * The scan never throws: any failure degrades to an empty list with a
 * `degraded` flag, so a broken heuristic can never fail a build.
 */
export function detectNativeModules(compilation: {
  modules?: Iterable<unknown>;
  warnings?: ArrayLike<{ message?: string }>;
}): DetectionResult {
  try {
    const dynamicImportDetected = hasDynamicImportWarning(compilation);
    const packageCache = new Map<string, NativePackageInfo | null>();
    const found = new Map<string, FederationNativeModule>();

    for (const module of compilation.modules ?? []) {
      const resource =
        typeof (module as { resource?: unknown })?.resource === 'string'
          ? ((module as { resource: string }).resource as string)
          : undefined;
      if (!resource || !NODE_MODULES_SEGMENT.test(resource)) continue;

      const info = resolveOwningPackage(resource, packageCache);
      if (!info) continue;

      const classified = classifyPackage(info);
      if (classified && !found.has(classified.package)) {
        found.set(classified.package, classified);
      }
    }

    let nativeModules = [...found.values()].sort((a, b) =>
      a.package.localeCompare(b.package)
    );

    // With a dynamic require in the graph the scan cannot claim a complete
    // view, so no entry keeps the stronger `static` label.
    if (dynamicImportDetected) {
      nativeModules = nativeModules.map((entry) => ({
        ...entry,
        confidence: 'heuristic' as const,
      }));
    }

    return { nativeModules, dynamicImportDetected, degraded: false };
  } catch {
    return { nativeModules: [], dynamicImportDetected: false, degraded: true };
  }
}

function hasDynamicImportWarning(compilation: {
  warnings?: ArrayLike<{ message?: string }>;
}): boolean {
  const warnings = compilation.warnings ?? [];
  for (let i = 0; i < warnings.length; i++) {
    if (/Critical dependency/.test(warnings[i]?.message ?? '')) {
      return true;
    }
  }
  return false;
}

function resolveOwningPackage(
  resource: string,
  cache: Map<string, NativePackageInfo | null>
): NativePackageInfo | null {
  const match = NODE_MODULES_SEGMENT.exec(resource);
  if (!match) return null;

  const afterNodeModules = resource.slice(
    resource.lastIndexOf('node_modules') + 'node_modules'.length + 1
  );
  const segments = afterNodeModules.split(/[/\\]/);
  const packageDirName = segments[0]?.startsWith('@')
    ? `${segments[0]}/${segments[1]}`
    : segments[0];
  if (!packageDirName) return null;

  const nodeModulesDir = resource.slice(
    0,
    resource.lastIndexOf('node_modules') + 'node_modules'.length
  );
  const cacheKey = path.join(nodeModulesDir, packageDirName);
  if (cache.has(cacheKey)) return cache.get(cacheKey) ?? null;

  let info: NativePackageInfo | null = null;
  const pkgDir = cacheKey;
  const pkgJsonPath = path.join(pkgDir, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    info = { pkgJsonPath, pkgDir };
  }
  cache.set(cacheKey, info);
  return info;
}

function classifyPackage(
  info: NativePackageInfo
): FederationNativeModule | null {
  let pkgJson: {
    name?: string;
    version?: string;
    keywords?: unknown;
    codegenConfig?: { name?: unknown };
  };
  try {
    pkgJson = JSON.parse(fs.readFileSync(info.pkgJsonPath, 'utf-8'));
  } catch {
    return null;
  }
  if (!pkgJson.name) return null;

  const hasNativeDir =
    fs.existsSync(path.join(info.pkgDir, 'ios')) ||
    fs.existsSync(path.join(info.pkgDir, 'android'));
  const hasCodegen = Boolean(pkgJson.codegenConfig);
  const hasNativeConfigFile = fs.existsSync(
    path.join(info.pkgDir, 'react-native.config.js')
  );
  const hasReactNativeKeyword =
    Array.isArray(pkgJson.keywords) &&
    pkgJson.keywords.includes('react-native');

  if (
    !hasNativeDir &&
    !hasCodegen &&
    !hasNativeConfigFile &&
    !hasReactNativeKeyword
  ) {
    return null;
  }

  const codegenName =
    typeof pkgJson.codegenConfig?.name === 'string'
      ? pkgJson.codegenConfig.name
      : undefined;

  return {
    package: pkgJson.name,
    version: pkgJson.version ?? 'unknown',
    ...(codegenName ? { modules: [codegenName] } : {}),
    turboModule: hasCodegen,
    // Native source directories or codegen config are direct evidence;
    // keyword/config-file presence alone is a strong hint, not proof.
    confidence: hasNativeDir || hasCodegen ? 'static' : 'heuristic',
  };
}
