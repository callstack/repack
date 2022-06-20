import './shims';
import { AssetsResolverPlugin } from './webpack/plugins/AssetsResolverPlugin';
import { DevelopmentPlugin } from './webpack/plugins/DevelopmentPlugin';
import { JavaScriptLooseModePlugin } from './webpack/plugins/JavaScriptLooseModePlugin';
import { LoggerPlugin } from './webpack/plugins/LoggerPlugin';
import { ManifestPlugin } from './webpack/plugins/ManifestPlugin';
import { OutputPlugin } from './webpack/plugins/OutputPlugin';
import { ReactRefreshPlugin } from './webpack/plugins/ReactRefreshPlugin';
import { RepackTargetPlugin } from './webpack/plugins/RepackTargetPlugin';

export * from './webpack/plugins/RepackPlugin';
export * from './webpack/utils';
export * from './commands/bundle';
export * from './commands/start';
export * from './types';
export * from './logging';

/** All sub-plugins used in {@link RepackPlugin}. */
export const plugins = {
  AssetsResolverPlugin,
  DevelopmentPlugin,
  JavaScriptLooseModePlugin,
  LoggerPlugin,
  ManifestPlugin,
  OutputPlugin,
  ReactRefreshPlugin,
  RepackTargetPlugin,
};
