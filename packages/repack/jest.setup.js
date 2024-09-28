global.__DEV__ = false;

// Increase the number of listeners to avoid MaxListenersExceededWarning
// caused by RspackVirtualModulesPlugin
// https://github.com/rspack-contrib/rspack-plugin-virtual-module/blob/827e9cbbf1e23eff4f0cd5b01fb2f3f319fce8f9/src/index.ts#L58
process.setMaxListeners(100);
