declare const commands: [
  {
    name: 'bundle';
    description: string;
    options: Array<any>;
    func: typeof import('./dist/commands/bundle').bundle;
  },
  {
    name: 'start';
    description: string;
    options: Array<any>;
    func: typeof import('./dist/commands/start').start;
  },
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
  },
];
export default commands;
