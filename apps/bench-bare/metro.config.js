const path = require('node:path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

// React Native's default Metro config. The only addition lets Metro see the
// monorepo's root node_modules, where pnpm keeps the actual package files;
// watching the whole repo would make Metro crawl every other app too.
module.exports = mergeConfig(getDefaultConfig(__dirname), {
  watchFolders: [path.resolve(__dirname, '../../node_modules')],
});
