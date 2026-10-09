import fs from 'node:fs';
import path from 'node:path';
import { buildSharedEntries } from '../../plugins/federationManifest/shared.js';
import type { FederationManifestSharedEntry } from '../../plugins/federationManifest/types.js';
import { getConfigFilePath } from '../common/config/getConfigFilePath.js';
import { loadProjectConfig } from '../common/config/loadProjectConfig.js';

/**
 * An app's bundler configuration could not be located, evaluated, or does
 * not instantiate a federation plugin. Tools map this to exit code 2 —
 * "could not run" — printing only `message`, never a stack.
 */
export class ConfigEvalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigEvalError';
  }
}

/** What extraction learned from one app's configuration. */
export interface ExtractedAppShared {
  /** Federation name declared by the plugin, else the app dir basename. */
  name: string;
  /** Constructor name of the matched plugin ('ModuleFederationPluginV1'…),
   * for consumers that must mirror the plugin version (federation-init). */
  pluginName: string | undefined;
  /** Virtual manifest entries: the user's shared option resolved against
   * this app's installed packages. */
  shared: FederationManifestSharedEntry[];
}

/** The minimal environment a config function is evaluated with. */
interface SyntheticConfigEnv {
  mode: 'production';
  context: string;
  platform: 'ios';
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * `rspack.<name>.<ext>` / `webpack.<name>.<ext>` — the shape federation-init
 * generates for scaffolded remotes (`rspack.store.mts`). Not conventional
 * bundler entry names, but a tool-generated workspace should not need a
 * conventional name for the tool's own checks to find its configs.
 */
const TOOLING_STYLE_CONFIG = /^(rspack|webpack)\..+\.(mts|cts|ts|mjs|cjs|js)$/;

/**
 * Last-resort discovery for app dirs that carry a tool-generated config
 * instead of a conventional `rspack.config.*`: use it only when the choice
 * is unambiguous — one rspack-style file wins (bundler preference order),
 * otherwise one webpack-style file; several candidates is a guess, and the
 * dry-run never guesses.
 */
function discoverToolingStyleConfigPath(root: string): string | null {
  let candidates: string[];
  try {
    candidates = fs.readdirSync(root);
  } catch {
    return null;
  }
  const byBundler = { rspack: [] as string[], webpack: [] as string[] };
  for (const entry of candidates) {
    const match = TOOLING_STYLE_CONFIG.exec(entry);
    if (match) byBundler[match[1] as 'rspack' | 'webpack'].push(entry);
  }
  const preferred =
    byBundler.rspack.length === 1
      ? byBundler.rspack
      : byBundler.rspack.length === 0 && byBundler.webpack.length === 1
        ? byBundler.webpack
        : null;
  return preferred ? path.join(root, preferred[0]) : null;
}

function discoverConfigPath(root: string, customPath?: string): string {
  // Same discovery order the bundler commands use (rspack first), with an
  // explicit --config-style path always winning.
  try {
    return getConfigFilePath('rspack', root, customPath);
  } catch {
    // fall through to webpack candidates
  }
  try {
    return getConfigFilePath('webpack', root, customPath);
  } catch {
    // fall through to the tool-generated naming
  }
  if (customPath === undefined) {
    const toolingStyle = discoverToolingStyleConfigPath(root);
    if (toolingStyle !== null) return toolingStyle;
  }
  throw new ConfigEvalError(
    `No bundler configuration found in ${root} — the dry-run reads the ` +
      'shared setup from the app rspack or webpack configuration.'
  );
}

/**
 * Evaluate one app's bundler configuration in-process and extract the
 * `shared` option from the Module Federation plugin instance it
 * instantiates, resolved into manifest-shaped entries against the app's
 * installed versions.
 *
 * The config is loaded exactly the way the bundler loads it
 * (`loadProjectConfig`), so a config that cannot be evaluated here fails
 * the same way it would fail a build. Duck-typed plugin detection
 * (`getSharedConfiguration`) keeps this module free of the heavy plugin
 * imports; the trust level is the same as running the bundler on this
 * machine's own configs.
 */
export async function extractAppShared(
  root: string,
  options: { configPath?: string } = {}
): Promise<ExtractedAppShared> {
  const configPath = discoverConfigPath(root, options.configPath);

  let config: unknown;
  try {
    config = await loadProjectConfig(configPath);
  } catch (error) {
    throw new ConfigEvalError(
      `Failed to load bundler config ${configPath}: ${messageOf(error)}`
    );
  }

  if (typeof config === 'function') {
    const env: SyntheticConfigEnv = {
      mode: 'production',
      context: root,
      platform: 'ios',
    };
    try {
      config = await (
        config as (env: SyntheticConfigEnv, argv: object) => unknown
      )(env, {});
    } catch (error) {
      throw new ConfigEvalError(
        `Bundler config ${configPath} failed while producing its ` +
          `configuration: ${messageOf(error)}`
      );
    }
  }

  const plugins = Array.isArray((config as { plugins?: unknown[] })?.plugins)
    ? ((config as { plugins: unknown[] }).plugins as unknown[])
    : [];
  const plugin = plugins.find(
    (candidate) =>
      typeof (candidate as { getSharedConfiguration?: unknown })
        ?.getSharedConfiguration === 'function'
  ) as
    | {
        getSharedConfiguration: () => unknown;
        config?: { name?: unknown };
        constructor?: { name?: string };
      }
    | undefined;

  if (!plugin) {
    throw new ConfigEvalError(
      `No Module Federation plugin instance with getSharedConfiguration() ` +
        `found in ${configPath} — the dry-run reads the shared option from ` +
        'the ModuleFederationPluginV1/V2 the config instantiates.'
    );
  }

  return {
    name:
      typeof plugin.config?.name === 'string' && plugin.config.name
        ? plugin.config.name
        : path.basename(root),
    pluginName: plugin.constructor?.name,
    shared: buildSharedEntries(plugin.getSharedConfiguration(), root),
  };
}
