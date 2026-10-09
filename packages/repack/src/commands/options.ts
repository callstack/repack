import path from 'node:path';
import { CLIError } from '../helpers/index.js';
import type { Bundler } from './types.js';

function parseBundler(value: string): Bundler {
  if (value === 'rspack' || value === 'webpack') {
    return value;
  }

  throw new CLIError(
    `Invalid bundler "${value}". Expected "rspack" or "webpack".`
  );
}

export const startCommandOptions = [
  {
    name: '--port <number>',
    description: 'The port number that runs the server on',
    parse: (val: string) => Number(val),
  },
  {
    name: '--host <string>',
    description: 'Set the server host',
    default: '',
  },
  {
    name: '--https',
    description: 'Enables https connections to the server',
  },
  {
    name: '--key <path>',
    description: 'Path to custom SSL key',
  },
  {
    name: '--cert <path>',
    description: 'Path to custom SSL cert',
  },
  {
    name: '--no-interactive',
    description: 'Disables interactive mode',
  },
  {
    name: '--reset-cache, --resetCache',
    description: 'Resets the transformation cache',
  },
  // options specific to Re.Pack
  {
    name: '--json',
    description: 'Log all messages to the console/stdout in JSON format',
  },
  {
    name: '--log-file <path>',
    description: 'Enables file logging to specified file',
    parse: (val: string) => path.resolve(val),
  },
  {
    name: '--log-requests',
    description: 'Enables logging of all requests to the server',
  },
  {
    name: '--platform <string>',
    description:
      'Run the dev server for the specified platform only. By default, the dev server will bundle for all platforms.',
  },
  {
    name: '--no-reverse-port',
    description:
      'Disables running ADB reverse automatically when bundling for Android',
  },
  {
    name: '--verbose',
    description: 'Enables verbose logging',
  },
  {
    name: '--max-workers <number>',
    description:
      '(Rspack only) The maximum number of workers to use for transformation parallelization ',
    parse: (val: string) => Number(val),
  },
  {
    name: '--config <path>',
    description: 'Path to a bundler config file, e.g webpack.config.js',
    parse: (val: string) => path.resolve(val),
  },
  {
    name: '--webpackConfig <path>',
    description:
      '[DEPRECATED] Path to a bundler config file, e.g webpack.config.js. Please use --config instead.',
    parse: (val: string) => path.resolve(val),
  },
  {
    name: '--bundler <string>',
    description:
      'Bundler engine to use: "rspack" or "webpack". If not specified, auto-detected from config filename.',
    parse: parseBundler,
  },
  {
    name: '--standalone',
    description:
      'Run this app in standalone mode: all shared dependencies become eager and no remote is consumed. Runtime-only — it is never persisted to any file',
  },
];

export const federationManifestCommandOptions = [
  {
    name: '--source <path>',
    description:
      'Federation manifest to inspect: a .json file, a directory containing repack-federation-manifest.json, or an http(s) URL. Also accepted as the first positional argument',
  },
  {
    name: '--json',
    description: 'Print the raw manifest as JSON to stdout',
  },
];

export const federationDoctorCommandOptions = [
  {
    name: '--host <source>',
    description:
      'Host manifest source: a .json file, a build output directory containing repack-federation-manifest.json, or an http(s) URL. Optional when repack-federation.json provides it',
  },
  {
    name: '--remotes <list>',
    description:
      'Comma-separated list of remote manifest sources (same shapes as --host). Optional when repack-federation.json provides them',
  },
  {
    name: '--format <format>',
    description: 'Output format: "json" prints machine-readable findings',
  },
  {
    name: '--allow-missing-manifests',
    description:
      'Report remotes without a manifest as warnings instead of errors',
  },
  {
    name: '--pairwise',
    description:
      'Additionally compare every remote pair for shared-dependency drift (shared checks only; native checks stay host-to-remote)',
  },
  {
    name: '--dry-run',
    description:
      'Pre-build mode: check shared version alignment, expected-library provisioning and config sanity from package.json and bundler configs only — no builds, no manifest fetches. Every finding carries an unbuilt caveat',
  },
];

export const federationInitCommandOptions = [
  {
    name: '--name <remote>',
    description:
      'Name of the remote to scaffold from the given feature folder (used as the federation name and remote key)',
  },
  {
    name: '--yes',
    description:
      'Pre-approve all presented diffs and auto-align divergent remote shared pins to the host versions (reporting each pkg: old → new)',
  },
  {
    name: '--standalone',
    description:
      'Record standalone support for the scaffolded remote in repack-federation.json. Refused for an existing remote that does not declare it',
  },
];

export const federationDevCommandOptions = [
  {
    name: '--apps <list>',
    description:
      'Comma-separated remotes to run for this session (default: every remote in repack-federation.json)',
  },
  {
    name: '--platform <platform>',
    description: 'App platform to print run guidance for: "ios" or "android"',
  },
  {
    name: '--launch',
    description:
      'Launch the app on the device once the session is ready (requires a single --platform; the wizard asks when neither launch flag is given on a TTY)',
  },
  {
    name: '--no-launch',
    description:
      'Never launch the app — serve only (the default without a TTY or with --no-interactive)',
  },
  {
    name: '--device <id>',
    description:
      'Device id passed through verbatim to react-native run-<platform> (only meaningful with --launch)',
    parse: (val: string) => val,
  },
  {
    name: '--port <port>',
    description:
      'Host dev-server port (overrides the port declared in repack-federation.json)',
    parse: (val: string) => Number(val),
  },
  {
    name: '--auto-ports',
    description: 'Reassign busy ports to free ones instead of failing',
  },
  {
    name: '--standalone <remote>',
    description:
      'Launch the named remote in standalone mode (requires it to declare "standalone": true)',
  },
  {
    name: '--no-interactive',
    description: 'Skip the interactive session wizard and use the default plan',
  },
  {
    name: '--json',
    description: 'Print the plan and status as machine-readable JSON',
  },
  {
    name: '--dry-run',
    description:
      'Print the plan a live run would use and exit without spawning anything',
  },
  {
    name: '--config <path>',
    description:
      'Path to a specific repack-federation.json (default: the nearest one up from the current directory)',
  },
];

export const bundleCommandOptions = [
  {
    name: '--entry-file <path>',
    description:
      'Path to the root JS file, either absolute or relative to JS root',
  },
  {
    name: '--platform <string>',
    description: 'Either "ios" or "android"',
    default: 'ios',
  },
  {
    name: '--dev [boolean]',
    description:
      'Enables development warnings and disables production optimisations',
    parse: (val: string) => val !== 'false',
    default: true,
  },
  {
    name: '--minify [boolean]',
    description:
      'Allows overriding whether bundle is minified. This defaults to ' +
      'false if dev is true, and true if dev is false. Disabling minification ' +
      'can be useful for speeding up production builds for testing purposes.',
    parse: (val: string) => val !== 'false',
  },
  {
    name: '--bundle-output <string>',
    description:
      'File name where to store the resulting bundle, ex. /tmp/groups.bundle',
  },
  {
    name: '--sourcemap-output <string>',
    description:
      'File name where to store the sourcemap file for resulting bundle, ex. /tmp/groups.map',
  },
  {
    name: '--assets-dest <string>',
    description:
      'Directory name where to store assets referenced in the bundle',
  },
  {
    name: '--reset-cache',
    description: 'Resets the transformation cache',
  },
  // noop, needed for compatibility
  {
    name: '--config-cmd',
    description: '(unsupported) Command to generate a JSON project config',
  },
  // options specific to Re.Pack
  {
    name: '--json <statsFile>',
    description: 'Stores stats in a file.',
    parse: (val: string) => path.resolve(val),
  },
  {
    name: '--stats <preset>',
    description:
      'It instructs Webpack on how to treat the stats:\n' +
      "'errors-only'  - only output when errors happen\n" +
      "'errors-warnings' - only output errors and warnings happen\n" +
      "'minimal' - only output when errors or new compilation happen\n" +
      "'none' - output nothing\n" +
      "'normal' - standard output\n" +
      "'verbose' - output everything\n" +
      "'detailed' - output everything except chunkModules and chunkRootModules\n" +
      "'summary' - output webpack version, warnings count and errors count",
  },
  {
    name: '--verbose',
    description: 'Enables verbose logging',
  },
  {
    name: '--watch',
    description: 'Watch for file changes',
  },
  {
    name: '--max-workers <number>',
    description:
      '(Rspack only) The maximum number of workers to use for transformation parallelization ',
    parse: (val: string) => Number(val),
  },
  {
    name: '--config <path>',
    description: 'Path to a bundler config file, e.g webpack.config.js',
    parse: (val: string) => path.resolve(val),
  },
  {
    name: '--webpackConfig <path>',
    description:
      '[DEPRECATED] Path to a bundler config file, e.g webpack.config.js. Please use --config instead.',
    parse: (val: string) => path.resolve(val),
  },
  {
    name: '--bundler <string>',
    description:
      'Bundler engine to use: "rspack" or "webpack". If not specified, auto-detected from config filename.',
    parse: parseBundler,
  },
  {
    name: '--standalone',
    description:
      'Build this app in standalone mode: all shared dependencies become eager and no remote is consumed. Runtime-only — it is never persisted to any file',
  },
];
