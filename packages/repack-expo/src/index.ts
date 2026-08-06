import { type ConfigPlugin, createRunOncePlugin } from 'expo/config-plugins';
import { withAndroidRepack } from './config/android.js';
import { withIosRepack } from './config/ios.js';
import {
  normalizeConfigPluginOptions,
  type RepackExpoPluginOptions,
} from './config/options.js';
import { validateExpoConfig } from './config/validateExpoConfig.js';

const withRepackExpo: ConfigPlugin<RepackExpoPluginOptions | void> = (
  config,
  options
) => {
  validateExpoConfig(config);
  const normalizedOptions = normalizeConfigPluginOptions(options);
  return withAndroidRepack(
    withIosRepack(config, normalizedOptions),
    normalizedOptions
  );
};

export = createRunOncePlugin(withRepackExpo, '@callstack/repack-expo', '0.0.0');
