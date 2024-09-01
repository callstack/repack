const commands: [
  {
    name: 'bundle';
    description: string;
    options: typeof import('./dist/commands/options').bundleCommandOptions;
    func: typeof import('./dist/commands/webpack').bundle;
  },
  {
    name: 'start';
    description: string;
    options: typeof import('./dist/commands/options').startCommandOptions;
    func: typeof import('./dist/commands/webpack').start;
  },
  {
    name: 'webpack-bundle';
    description: string;
    options: typeof import('./dist/commands/options').bundleCommandOptions;
    func: typeof import('./dist/commands/webpack').bundle;
  },
  {
    name: 'webpack-start';
    description: string;
    options: typeof import('./dist/commands/options').startCommandOptions;
    func: typeof import('./dist/commands/webpack').start;
  },
];
export default commands;
