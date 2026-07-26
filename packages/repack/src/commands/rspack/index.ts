import { bundleCommandOptions, startCommandOptions } from '../options.js';

import type { bundle } from './bundle.js';
import type { start } from './start.js';

// The command modules load '@rspack/core' which is ESM-only in Rspack 2,
// so they are imported lazily: first the Node version guard runs and turns
// an unsupported setup into an actionable error instead of ERR_REQUIRE_ESM,
// and loading the project config stays free of bundler imports.
const lazyBundle = async (...args: Parameters<typeof bundle>) => {
  const { ensureNodeSupportsRspack } = await import('./ensureNodeCompat.js');
  ensureNodeSupportsRspack();
  const { bundle } = await import('./bundle.js');
  return bundle(...args);
};

const lazyStart = async (...args: Parameters<typeof start>) => {
  const { ensureNodeSupportsRspack } = await import('./ensureNodeCompat.js');
  ensureNodeSupportsRspack();
  const { start } = await import('./start.js');
  return start(...args);
};

const commands = [
  {
    name: 'bundle',
    description: 'Build the bundle for the provided JavaScript entry file.',
    options: bundleCommandOptions,
    func: lazyBundle,
  },
  {
    name: 'webpack-bundle',
    description: 'Build the bundle for the provided JavaScript entry file.',
    options: bundleCommandOptions,
    func: lazyBundle,
  },
  {
    name: 'start',
    description: 'Start the React Native development server.',
    options: startCommandOptions,
    func: lazyStart,
  },
  {
    name: 'webpack-start',
    description: 'Start the React Native development server.',
    options: startCommandOptions,
    func: lazyStart,
  },
] as const;

export default commands;
