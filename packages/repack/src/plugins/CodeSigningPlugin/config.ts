import { validate } from 'schema-utils';

/**
 * {@link CodeSigningPlugin} configuration options.
 */
export interface CodeSigningPluginConfig {
  /** Whether the plugin is enabled. Defaults to true */
  enabled?: boolean;
  /** Path to the private key. */
  privateKeyPath: string;
  /** Names of chunks to exclude from being signed. */
  excludeChunks?: string[] | RegExp | RegExp[];
  /**
   * Path to the public key file. When provided, the plugin will automatically
   * embed the public key into native project files (Info.plist for iOS,
   * strings.xml for Android) so that the runtime can verify signed bundles.
   *
   * Relative paths are resolved from the project root (compiler context).
   */
  publicKeyPath?: string;
  /**
   * Override auto-detected paths to native project files where the public key
   * should be embedded. Only used when `publicKeyPath` is set.
   */
  nativeProjectPaths?: {
    /** Path to iOS Info.plist. Auto-detected if not provided. */
    ios?: string;
    /** Path to Android strings.xml. Auto-detected if not provided. */
    android?: string;
  };
}

type Schema = Parameters<typeof validate>[0];

export const optionsSchema: Schema = {
  type: 'object',
  properties: {
    enabled: { type: 'boolean' },
    privateKeyPath: { type: 'string', minLength: 1 },
    excludeChunks: {
      anyOf: [
        {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        {
          type: 'array',
          items: {
            instanceof: 'RegExp',
          },
        },
        {
          instanceof: 'RegExp',
        },
      ],
    },
    publicKeyPath: { type: 'string', minLength: 1 },
    nativeProjectPaths: {
      type: 'object',
      properties: {
        ios: { type: 'string', minLength: 1 },
        android: { type: 'string', minLength: 1 },
      },
      additionalProperties: false,
    },
  },
  required: ['privateKeyPath'],
  additionalProperties: false,
};

export function validateConfig(config: CodeSigningPluginConfig) {
  validate(optionsSchema, config, { name: 'CodeSigningPlugin' });
}
