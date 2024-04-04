---
"@callstack/repack": major
---

BREAKING CHANGE:

Re.Pack commands now override the default `start` and `bundle` CLI commands for enhanced functionality and compatibility with `react-native` versions >= 0.74. For earlier versions of `react-native` (< 0.74), the traditional commands `webpack-start` and `webpack-bundle` remain available and recommended.

This change primarily impacts setups where both Metro and Re.Pack are used simultaneously.

To maintain your current workflow without adopting these overrides, especially to avoid conflicts in projects using both Metro and Re.Pack, you can opt out by filtering out the new command names and reverting to the legacy `webpack` prefixed commands:

```js
// react-native.config.js
const commands = require("@callstack/repack/commands");

module.exports = {
  commands: commands.filter((command) => command.name.startsWith("webpack")),
};
```

Additionally, this update ensures that running `react-native run-ios` or `react-native run-android` will launch the Re.Pack dev server by default instead of the Metro dev server.
