import path from 'node:path';
import type { BundleArguments, StartArguments } from '../../types.js';

function normalizeEntryFile(entryFile: string) {
  return path.isAbsolute(entryFile) || entryFile.startsWith('./')
    ? entryFile
    : `./${entryFile}`;
}

export function getCliOverrides(args: StartArguments | BundleArguments) {
  const overrides: any = {};

  if ('dev' in args) {
    overrides.mode = args.dev ? 'development' : 'production';
    overrides.optimization = { minimize: args.minify };
    overrides.entry = normalizeEntryFile(args.entryFile);
  } else {
    overrides.devServer = {
      port: args.port,
      host: args.host || undefined,
      server: args.https
        ? {
            type: 'https',
            options: {
              key: args.key,
              cert: args.cert,
            },
          }
        : undefined,
    };
  }

  return overrides;
}
