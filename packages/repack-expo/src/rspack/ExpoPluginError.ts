export type ExpoPluginErrorCode =
  | 'AMBIGUOUS_ENTRY'
  | 'DYNAMIC_ENTRY_UNSUPPORTED'
  | 'INVALID_CHUNK_FILENAME'
  | 'INVALID_ROUTER_ROOT'
  | 'REPACK_PLATFORM_CONFLICT'
  | 'REPACK_PLUGIN_CONFLICT'
  | 'REACT_NATIVE_RESOLUTION_FAILED'
  | 'RSPACK_REQUIRED'
  | 'UNSUPPORTED_ENVIRONMENT'
  | 'UNSUPPORTED_PLATFORM';

export type ExpoPluginErrorOptions = {
  code: ExpoPluginErrorCode;
  message: string;
  recovery: string;
};

export class ExpoPluginError extends Error {
  readonly code: ExpoPluginErrorCode;
  readonly recovery: string;

  constructor(options: ExpoPluginErrorOptions) {
    super(options.message);
    this.name = 'ExpoPluginError';
    this.code = options.code;
    this.recovery = options.recovery;
  }
}
