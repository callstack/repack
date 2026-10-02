import path from 'node:path';
import type { Compiler as RspackCompiler } from '@rspack/core';
import { buildFederationManifest } from './buildFederationManifest.js';
import { detectNativeModules } from './detectNativeModules.js';
import {
  DEFAULT_MANIFEST_FILENAME,
  type FederationManifestObjectOptions,
  type FederationManifestOption,
} from './types.js';

const PLUGIN_NAME = 'RepackFederationManifestPlugin';

/** Everything the manifest needs, captured from the plugin config at apply. */
export interface FederationManifestParams {
  /** The user-provided `manifest` option (truthy; caller gates the call). */
  option: NonNullable<FederationManifestOption>;
  name: string;
  /** Normalized shared config (what the inner MF plugin receives). */
  shared: unknown;
  /** Raw user `remotes` config, before remote loaders are generated. */
  remotes?: unknown;
  /** Raw user `exposes` config. */
  exposes?: unknown;
  filename?: string;
}

export function normalizeFederationManifestOption(
  option: NonNullable<FederationManifestOption>
): Required<Omit<FederationManifestObjectOptions, 'filePath'>> & {
  filePath?: string;
} {
  const objectOptions =
    typeof option === 'object' && option !== null ? option : {};
  return {
    fileName: objectOptions.fileName || DEFAULT_MANIFEST_FILENAME,
    filePath: objectOptions.filePath,
    nativeAnalysis: objectOptions.nativeAnalysis ?? true,
  };
}

/**
 * Register the compiler hooks that emit the Repack federation manifest.
 *
 * Must only be called when the `manifest` option is enabled: this is the
 * only place the plugin taps compiler hooks, keeping the default path
 * byte-identical to the pre-manifest behavior.
 */
export function applyFederationManifest(
  __compiler: unknown,
  params: FederationManifestParams
): void {
  const compiler = __compiler as RspackCompiler;
  const options = normalizeFederationManifestOption(params.option);

  compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
    compilation.hooks.afterProcessAssets.tap(PLUGIN_NAME, () => {
      try {
        const { nativeModules, dynamicImportDetected, degraded } =
          options.nativeAnalysis
            ? detectNativeModules(compilation)
            : {
                nativeModules: [],
                dynamicImportDetected: false,
                degraded: false,
              };

        const rawPublicPath = compiler.options.output.publicPath;
        const manifest = buildFederationManifest({
          context: compiler.context,
          name: params.name,
          shared: params.shared,
          remotes: params.remotes,
          exposes: params.exposes,
          filename: params.filename,
          publicPath:
            typeof rawPublicPath === 'string' ? rawPublicPath : 'auto',
          platform:
            typeof compiler.options.name === 'string'
              ? compiler.options.name
              : undefined,
          nativeModules,
          dynamicImportDetected,
          nativeAnalysis: options.nativeAnalysis,
          nativeAnalysisDegraded: degraded,
        });

        const assetName = options.filePath
          ? path.posix.join(options.filePath, options.fileName)
          : options.fileName;

        if (compilation.getAsset(assetName)) {
          compilation.warnings.push(
            new Error(
              `[${PLUGIN_NAME}] Asset '${assetName}' already exists, ` +
                'skipping manifest emission. Rename it with the manifest.fileName option.'
            )
          );
          return;
        }

        compilation.emitAsset(
          assetName,
          new compiler.webpack.sources.RawSource(
            JSON.stringify(manifest, null, 2)
          )
        );
      } catch (error) {
        // The manifest is observational: a failure here must never fail the
        // build, so degrade to a warning.
        compilation.warnings.push(
          new Error(
            `[${PLUGIN_NAME}] Failed to emit the federation manifest: ` +
              `${error instanceof Error ? error.message : String(error)}`
          )
        );
      }
    });
  });
}
