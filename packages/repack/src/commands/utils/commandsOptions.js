const path = require('path');

const startCommandOptions = [
  {
    name: '--cert <path>',
    description: 'Path to custom SSL cert',
  },
  {
    name: '--host <string>',
    description: '(default: "")',
  },
  {
    name: '--http',
    description: 'Enables https connections to the server',
  },
  {
    name: '--key <path>',
    description: 'Path to custom SSL key',
  },
  {
    name: '--port <number>',
    description: 'The port number that runs the server on',
  },
  {
    name: '--no-interactive',
    description: 'Disables interactive mode',
  },
  {
    name: '--silent',
    description: 'Silents all logs to the console/stdout',
  },
  {
    name: '--experimental-debugger',
    description:
      "[Experimental] Enable the new debugger experience and 'j' to debug. This enables the new frontend experience only: connection reliability and some basic features are unstable in this release.",
  },
  {
    name: '--verbose',
    description: 'Enables verbose logging',
  },
  {
    name: '--silent',
    description: 'Silents all logs to the console/stdout',
  },
  {
    name: '--json',
    description: 'Log all messages to the console/stdout in JSON format',
  },
  {
    name: '--reverse-port',
    description: 'ADB reverse port on starting devServers only for Android',
  },
  {
    name: '--log-file <string>',
    description: 'Enables file logging to specified file',
  },
];

const bundleCommandOptions = [
  {
    name: '--assets-dest <string>',
    description:
      'Directory name where to store assets referenced in the bundle',
  },
  {
    name: '--entry-file <path>',
    description:
      'Path to the root JS file, either absolute or relative to JS root',
  },
  {
    name: '--minify [boolean]',
    description:
      'Allows overriding whether bundle is minified. This defaults to false if dev is true, and true if dev is false. Disabling minification can be useful for speeding up production builds for testing purposes.',
  },
  {
    name: '--dev [boolean]',
    description:
      'If false, warnings are disabled and the bundle is minified (default: true)',
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
    name: '--platform <string>',
    description: 'Either "ios" or "android" (default: "ios")',
  },
  {
    name: '--reset-cache',
    description: 'Removes cached files (default: false)',
  },
  {
    name: '--verbose',
    description: 'Enables verbose logging',
  },
  {
    name: '--json <statsFile>',
    description: 'Stores stats in a file.',
    parse: (val) => path.resolve(val),
  },
  {
    name: '--stats <preset>',
    description: 'It instructs Webpack on how to treat the stats e.g. normal',
  },
];

module.exports = { startCommandOptions, bundleCommandOptions };
