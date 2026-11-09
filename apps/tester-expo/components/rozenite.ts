// Rozenite DevTools plugins are opt-in. `__WITH_ROZENITE__` is only true when
// the dev server runs with WITH_ROZENITE=true; otherwise the bundler drops the
// require below and the app contains no DevTools code.
const plugins: typeof import('./rozenitePlugins') | undefined =
  __WITH_ROZENITE__ ? require('./rozenitePlugins') : undefined;

export const useDevTools = plugins?.useDevTools ?? (() => {});
