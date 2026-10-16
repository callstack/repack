import type { FederationManifest } from '../../plugins/federationManifest/types.js';

function pad(value: string, width: number): string {
  return value + ' '.repeat(Math.max(0, width - value.length));
}

function widthOf(values: string[], minimum: number): number {
  return values.reduce((max, value) => Math.max(max, value.length), minimum);
}

/**
 * Render a human-readable multi-line summary of a federation manifest.
 */
export function formatManifest(manifest: FederationManifest): string {
  const lines: string[] = [];
  const meta = manifest.metaData;
  const buildInfo = meta?.buildInfo;

  lines.push(`${manifest.name || manifest.id}`);
  lines.push(`  id:    ${manifest.id}`);
  lines.push(`  name:  ${manifest.name}`);
  lines.push(`  type:  ${meta?.type ?? 'unknown'}`);
  lines.push(
    `  build: ${buildInfo?.buildVersion ?? 'unknown'} (${buildInfo?.buildName ?? 'unknown'})`
  );

  const shared = manifest.shared ?? [];
  lines.push('', `shared (${shared.length}):`);
  if (shared.length > 0) {
    const nameWidth = widthOf(
      shared.map((entry) => entry.name),
      'package'.length
    );
    const versionWidth = widthOf(
      shared.map((entry) => entry.version),
      'resolved'.length
    );
    const requiredWidth = widthOf(
      shared.map((entry) => entry.requiredVersion),
      'required'.length
    );
    lines.push(
      `  ${pad('package', nameWidth)}  ${pad('resolved', versionWidth)}  ${pad('required', requiredWidth)}  flags`
    );
    for (const entry of shared) {
      const flags = [entry.singleton && 'singleton', entry.eager && 'eager']
        .filter(Boolean)
        .join(' ');
      lines.push(
        `  ${pad(entry.name, nameWidth)}  ${pad(entry.version, versionWidth)}  ${pad(entry.requiredVersion, requiredWidth)}  ${flags}`
      );
    }
  }

  const remotes = manifest.remotes ?? [];
  lines.push('', `remotes (${remotes.length}):`);
  if (remotes.length > 0) {
    const aliasWidth = widthOf(
      remotes.map((entry) => entry.alias),
      'alias'.length
    );
    for (const entry of remotes) {
      lines.push(
        `  ${pad(entry.alias, aliasWidth)}  ${entry.federationContainerName}  ${entry.entry}`
      );
    }
  }

  const exposes = manifest.exposes ?? [];
  lines.push('', `exposes (${exposes.length}):`);
  for (const entry of exposes) {
    lines.push(`  ${entry.name}  ${entry.path}`);
  }

  const native = manifest.reactNative;
  lines.push('', 'react-native:');
  lines.push(`  version: ${native?.version ?? 'unknown'}`);
  if (native?.dynamicImportDetected) {
    lines.push('  dynamic imports detected: true');
  }
  const modules = native?.nativeModules ?? [];
  lines.push(`  native modules (${modules.length}):`);
  if (modules.length > 0) {
    const packageWidth = widthOf(
      modules.map((entry) => entry.package),
      'package'.length
    );
    const versionWidth = widthOf(
      modules.map((entry) => entry.version),
      'version'.length
    );
    for (const entry of modules) {
      lines.push(
        `  ${pad(entry.package, packageWidth)}  ${pad(entry.version, versionWidth)}  ${pad(entry.confidence, 9)}  ${entry.turboModule ? 'turbo-module' : ''}`
      );
    }
  }
  if (native?.note) {
    lines.push(`  note: ${native.note}`);
  }

  return lines.join('\n');
}
