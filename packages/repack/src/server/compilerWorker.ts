import webpack from 'webpack';

const webpackConfigPath = process.argv[2];
const webpackConfig = require(webpackConfigPath) as webpack.Configuration;
const watchOptions = webpackConfig.watchOptions ?? {};
const compiler = webpack(webpackConfig);

compiler.hooks.watchRun.tap('compilerWorker', () => {
  process.send?.({ event: 'watchRun' });
});

compiler.watch(watchOptions, (error) => {
  if (error) {
    console.error(error);
    process.exit(2);
  }
});
