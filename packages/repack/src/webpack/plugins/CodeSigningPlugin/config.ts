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
}

type Schema = Parameters<typeof validate>[0];

export const optionsSchema: Schema = {
  type: 'object',
  properties: {
    enabled: { type: 'boolean' },
    privateKeyPath: { type: 'string' },
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
  },
  required: ['privateKeyPath'],
  additionalProperties: false,
};

export function validateConfig(config: CodeSigningPluginConfig): void {
  validate(optionsSchema, config, { name: 'CodeSigningPlugin' });
}
