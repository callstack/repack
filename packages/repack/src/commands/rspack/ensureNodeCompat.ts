import semver from 'semver';
import { CLIError, getRspackVersion } from '../../helpers/index.js';

// Rspack 2 is published as a pure ESM package and declares
// engines.node: "^20.19.0 || >=22.12.0" - the versions where
// loading ESM through require() is supported.
const RSPACK_2_NODE_RANGE = '^20.19.0 || >=22.12.0';

/**
 * Fails fast with an actionable error when the installed Rspack major
 * requires a newer Node.js version than the current one.
 *
 * Without this guard, loading `@rspack/core` v2 on an unsupported Node
 * version crashes with an obscure `ERR_REQUIRE_ESM` error.
 */
export function ensureNodeSupportsRspack() {
  const rspackVersion = getRspackVersion();

  // not resolvable - let the import of '@rspack/core' surface its own error
  if (!rspackVersion) return;

  if (semver.major(semver.coerce(rspackVersion) ?? '0.0.0') < 2) return;

  if (semver.satisfies(process.versions.node, RSPACK_2_NODE_RANGE)) return;

  throw new CLIError(
    `Rspack ${rspackVersion} requires Node.js ^20.19.0 || >=22.12.0 - ` +
      `found ${process.versions.node}. ` +
      'Upgrade Node.js or use @rspack/core@1 instead.'
  );
}
