// Entry of the Bundle Mode fixture: imports Worklets and one worklet the regular way, so
// both the entry point and a generated worklet reach the entry chunk, and reaches a
// second worklet through a dynamic import, which is what shows whether the cache group
// really pulls every Worklets module back into the entry chunk.
import 'react-native-worklets';
import './worklet.js';

// Worklets reads `_WORKLETS_BUNDLE_MODE_ENABLED` as it boots, so the polyfill has to run
// ahead of the app for the guards to be disarmed by the time anything uses them.
globalThis.__FLAG_AT_APP_ENTRY__ = globalThis._WORKLETS_BUNDLE_MODE_ENABLED;
globalThis.__APP_ENTRY__ = true;

if (globalThis.__LOAD_LAZY_WORKLET__) {
  import('./lazy.js');
}
