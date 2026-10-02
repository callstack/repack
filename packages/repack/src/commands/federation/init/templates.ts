/**
 * Versionless bundler-config templates for `federation-init`. Generated
 * configs consume `defineShared()` for the shared setup and contain no
 * literal version pins — exact pins materialize at build time from the
 * installed packages. The `SHARED_DEPS` list between the marker comments is
 * the merge surface; markers are provenance only, merges are key-level.
 */

export interface RemoteConfigTemplate {
  bundler: 'rspack' | 'webpack';
  remoteName: string;
  /** Feature folder path relative to the remote root, e.g. `../../features/store`. */
  featureFolderRel: string;
  /** Scanned ∩ host-provides package names — names only, never versions. */
  sharedDeps: string[];
  /** Mirrored from the host's evaluated plugin instance. */
  pluginVersion: 'V1' | 'V2';
}

export function renderRemoteConfig(config: RemoteConfigTemplate): string {
  const { bundler, remoteName, featureFolderRel, sharedDeps, pluginVersion } =
    config;
  const defineFn =
    bundler === 'rspack' ? 'defineRspackConfig' : 'defineWebpackConfig';
  const depsBlock =
    sharedDeps.length === 0
      ? 'const SHARED_DEPS = [];'
      : `const SHARED_DEPS = [\n${sharedDeps
          .map((dep) => `  '${dep}',`)
          .join('\n')}\n];`;

  return `// @repack:federation-init ${remoteName} — manual edits are preserved; re-runs merge key-level, never rewrite
import * as Repack from '@callstack/repack';

// repack:federation-init:shared:start
${depsBlock}
// repack:federation-init:shared:end

export default Repack.${defineFn}((env) => ({
  mode: env.mode,
  context: env.context,
  entry: '${featureFolderRel}/index',
  plugins: [
    new Repack.RepackPlugin(),
    new Repack.plugins.ModuleFederationPlugin${pluginVersion}({
      name: '${remoteName}',
      remotes: {},
      exposes: {
        './*': '${featureFolderRel}/*',
      },
      shared: Repack.defineShared(SHARED_DEPS, {
        context: env.context,
        role: 'remote',
        mode: env.argv?.standalone ? 'standalone' : 'federated',
      }),
    }),
  ],
}));
`;
}

/**
 * Extract the `SHARED_DEPS` names from a generated config between the
 * marker comments. Returns null when the markers are absent (a hand-written
 * config), which callers treat as "cannot determine".
 */
export function sharedDepsFromConfig(content: string): string[] | null {
  const block =
    /repack:federation-init:shared:start([\s\S]*?)repack:federation-init:shared:end/.exec(
      content
    );
  if (!block) return null;
  return [...block[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
}
