import type { ConfigPlugin } from 'expo/config-plugins';
import { ConfigPluginError } from './ConfigPluginError.js';

type BaseExpoConfig = Parameters<ConfigPlugin>[0];
type ExpoConfig = BaseExpoConfig & {
  android?: BaseExpoConfig['android'] & { jsEngine?: string };
  ios?: BaseExpoConfig['ios'] & { jsEngine?: string };
  jsEngine?: string;
  newArchEnabled?: boolean;
};

export function validateExpoConfig(config: ExpoConfig): void {
  if (config.newArchEnabled === false) {
    throw new ConfigPluginError({
      code: 'NEW_ARCH_REQUIRED',
      message: '@callstack/repack-expo requires React Native New Architecture.',
      recovery:
        'Remove the expo.newArchEnabled=false override and run expo prebuild again.',
    });
  }

  const configuredEngines = [
    config.jsEngine,
    config.ios?.jsEngine,
    config.android?.jsEngine,
  ].filter((engine): engine is string => engine !== undefined);
  if (configuredEngines.some((engine) => engine !== 'hermes')) {
    throw new ConfigPluginError({
      code: 'HERMES_REQUIRED',
      message: '@callstack/repack-expo v1 supports Hermes only.',
      recovery:
        'Remove the JSC override or set expo.jsEngine and platform overrides to hermes.',
    });
  }

  if (config.updates && config.updates.enabled !== false) {
    throw new ConfigPluginError({
      code: 'ACTIVE_EXPO_UPDATES',
      message:
        '@callstack/repack-expo v1 cannot coexist with active Expo Updates.',
      recovery:
        'Set expo.updates.enabled to false or remove expo-updates before running prebuild.',
    });
  }
}
