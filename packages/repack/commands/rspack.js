console.warn(
  '[Re.Pack] Importing "@callstack/repack/commands/rspack" is deprecated. Use "@callstack/repack/commands" instead.'
);
const { createBoundCommands } = require('../dist/commands/index.js');
module.exports = createBoundCommands('rspack');
