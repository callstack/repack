import { formatManifest } from './federation/inspect.js';
import {
  loadManifest,
  ManifestInvalidError,
  ManifestNotFoundError,
} from './federation/loadManifest.js';
import type { CliConfig, FederationManifestArguments } from './types.js';

/**
 * Print a human-readable summary of a federation manifest, or the raw
 * manifest as JSON with `--json`.
 *
 * @param argv Original, non-parsed arguments; the first one is the manifest source.
 * @param _cliConfig Configuration object containing platform and project settings.
 * @param args Parsed command line arguments.
 */
export async function federationManifest(
  argv: string[],
  _cliConfig: CliConfig,
  args: FederationManifestArguments
) {
  const source = argv[0] ?? args.source;
  if (!source) {
    console.error(
      'No manifest source given. Pass it as the first argument or with ' +
        '--source: a .json file, a directory containing ' +
        'repack-federation-manifest.json, or an http(s) URL.'
    );
    process.exit(2);
    return;
  }

  try {
    const { manifest } = await loadManifest(source);
    if (args.json) {
      console.log(JSON.stringify(manifest, null, 2));
    } else {
      console.log(formatManifest(manifest));
    }
  } catch (error) {
    if (
      error instanceof ManifestNotFoundError ||
      error instanceof ManifestInvalidError
    ) {
      console.error(`${error.name}: ${error.message}`);
      process.exit(2);
      return;
    }
    throw error;
  }
}
