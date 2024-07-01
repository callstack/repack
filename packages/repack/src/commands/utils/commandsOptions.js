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

export { startCommandOptions };
