# Worklets Bundle Mode fixture

A minimal React Native app used by
`tests/integration/src/plugins/WorkletsBundleModePlugin.test.ts`, shaped so
`WorkletsBundleModePlugin` behaves exactly as it does in a real project.

`WorkletsBundleModePlugin` resolves `react-native-worklets` from the compiler
context (`require.resolve('react-native-worklets/package.json', { paths: [context] })`)
and `detectWorkletsBundleMode` reads the project's own Babel config, so neither can be
faked with aliases or in-memory modules — the app and its `node_modules` have to exist on
disk. That is why the fixture ships a real directory tree, and why the root `.gitignore`
makes one scoped exception for it.

    project/
      babel.config.js            # bundleMode: true — the only thing that turns the feature on
      index.js                   # imports Worklets, one worklet, and one behind import()
      worklet.js / lazy.js       # import the generated factories by request
      node_modules/
        react-native-reanimated/ # version 4, which ReanimatedPlugin requires
        react-native-worklets/
          package.json           # 0.13.0, the floor the version gate enforces; react-native -> src,
                                 # main -> lib/module, like the real one
          src/index.ts           # WORKLETS_ENTRY_PATHS[0]: the module that owns id -2
          lib/module/index.js    # WORKLETS_ENTRY_PATHS[1]: the variant it competes with
          bundleMode/polyfills/prepareBundleMode.js
          plugin/index.js        # flips the Bundle Mode flag, like the real plugin
          .worklets/<hash>.js    # what the real plugin generates during the transform

The fixture package is a stand-in, not a copy: it carries the file layout, the resolve
fields and the flag literal the design depends on, and nothing else. `plugin/index.js`
reproduces the one transform the tests need — flipping the `_WORKLETS_BUNDLE_MODE_ENABLED`
literal — while workletization is not reproduced. The two `.worklets/<hash>.js` files are
checked in rather than generated, because the request the real plugin emits for them is
identical either way.
