/** Default asset name for the Repack federation manifest. */
export const DEFAULT_MANIFEST_FILENAME = 'repack-federation-manifest.json';

/**
 * Object form of the `manifest` option on `ModuleFederationPluginV1` and
 * `ModuleFederationPluginV2`.
 */
export interface FederationManifestObjectOptions {
  /**
   * Name of the emitted manifest file.
   * Defaults to `repack-federation-manifest.json`.
   */
  fileName?: string;
  /**
   * Subdirectory inside the compiler output to emit the manifest into.
   * Defaults to the output root.
   */
  filePath?: string;
  /**
   * Scan the module graph for native modules and populate the
   * `reactNative.nativeModules` block. Defaults to `true` when the manifest
   * is enabled.
   */
  nativeAnalysis?: boolean;
}

/**
 * Value accepted by the `manifest` option: `true` enables emission with
 * defaults, an object customizes it, `false` (or absent) disables it.
 */
export type FederationManifestOption =
  | boolean
  | FederationManifestObjectOptions;

/** Confidence level of a native module detection. */
export type NativeModuleConfidence = 'static' | 'heuristic';

/** One entry in `reactNative.nativeModules`. */
export interface FederationNativeModule {
  package: string;
  version: string;
  modules?: string[];
  turboModule: boolean;
  confidence: NativeModuleConfidence;
}

/** One entry in `shared[]`. */
export interface FederationManifestSharedEntry {
  name: string;
  version: string;
  singleton: boolean;
  eager: boolean;
  requiredVersion: string;
}

/** One entry in `remotes[]`, upstream mf-manifest compatible shape. */
export interface FederationManifestRemoteEntry {
  federationContainerName: string;
  moduleName: string;
  alias: string;
  entry: string;
}

/** One entry in `exposes[]`. */
export interface FederationManifestExposeEntry {
  id: string;
  name: string;
  path: string;
}

/** React Native specific extension block. */
export interface FederationManifestNativeBlock {
  version: string;
  newArch?: boolean;
  platforms: string[];
  nativeModules: FederationNativeModule[];
  dynamicImportDetected: boolean;
  /** Present whenever the list may be incomplete or detection degraded. */
  note?: string;
}

/** Schema v1 of `repack-federation-manifest.json`. */
export interface FederationManifest {
  manifestVersion: 1;
  id: string;
  name: string;
  metaData: {
    name: string;
    globalName: string;
    type: 'host' | 'remote';
    buildInfo: { buildVersion: string; buildName: string };
    remoteEntry?: { name: string; path: string; type: string };
    publicPath: string;
  };
  shared: FederationManifestSharedEntry[];
  remotes: FederationManifestRemoteEntry[];
  exposes: FederationManifestExposeEntry[];
  reactNative: FederationManifestNativeBlock;
}
