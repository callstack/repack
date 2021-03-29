const production = process.env.NODE_ENV === 'production';
const basePath = production ? '/react-native-webpack-toolkit' : '';

module.exports = {
  env: {
    BASE_PATH: basePath,
  },
  basePath,
};
