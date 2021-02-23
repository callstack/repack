import webpack from 'webpack';

const webpackConfigPath = process.argv[2];

const compiler = webpack(require(webpackConfigPath));
compiler.watch({}, (error) => {
  if (error) {
    console.error(error);
    process.exit(2);
  }
});
