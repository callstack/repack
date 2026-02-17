const path = require('node:path');

module.exports = function getPolyfills() {
  return [
    path.join(__dirname, 'polyfill1.js'),
    path.join(__dirname, 'polyfill2.js'),
  ];
};
