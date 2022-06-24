const commands: [
  {
    name: 'webpack-bundle';
    description: string;
    options: Array<any>;
    func: typeof import('./dist/commands/bundle').bundle;
  },
  {
    name: 'webpack-start';
    description: string;
    options: Array<any>;
    func: typeof import('./dist/commands/start').start;
  }
];
export default commands;
