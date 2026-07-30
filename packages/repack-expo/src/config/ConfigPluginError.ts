export type ConfigPluginErrorCode =
  | 'ACTIVE_EXPO_UPDATES'
  | 'HERMES_REQUIRED'
  | 'INCOMPATIBLE_NATIVE_TEMPLATE'
  | 'INVALID_OPTIONS'
  | 'NEW_ARCH_REQUIRED';

export class ConfigPluginError extends Error {
  readonly code: ConfigPluginErrorCode;
  readonly recovery: string;

  constructor(options: {
    code: ConfigPluginErrorCode;
    message: string;
    recovery: string;
  }) {
    super(`${options.message}\n\nRecovery: ${options.recovery}`);
    this.name = 'RepackExpoConfigPluginError';
    this.code = options.code;
    this.recovery = options.recovery;
  }
}
