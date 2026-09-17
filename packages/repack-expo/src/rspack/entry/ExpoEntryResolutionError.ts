export type ExpoEntryResolutionErrorCode =
  | 'ENTRY_NOT_DEFINED'
  | 'ENTRY_NOT_FOUND'
  | 'EXPO_PROJECT_NOT_FOUND'
  | 'INVALID_PACKAGE_JSON'
  | 'METRO_ENTRY_UNSUPPORTED'
  | 'UNSUPPORTED_PLATFORM';

export type ExpoEntryResolutionErrorOptions = {
  code: ExpoEntryResolutionErrorCode;
  message: string;
  platform?: string;
  projectRoot?: string;
  requestedEntry?: string;
  recovery: string;
};

export class ExpoEntryResolutionError extends Error {
  readonly code: ExpoEntryResolutionErrorCode;
  readonly platform?: string;
  readonly projectRoot?: string;
  readonly requestedEntry?: string;
  readonly recovery: string;

  constructor(options: ExpoEntryResolutionErrorOptions) {
    super(options.message);
    this.name = 'ExpoEntryResolutionError';
    this.code = options.code;
    this.platform = options.platform;
    this.projectRoot = options.projectRoot;
    this.requestedEntry = options.requestedEntry;
    this.recovery = options.recovery;
  }
}
