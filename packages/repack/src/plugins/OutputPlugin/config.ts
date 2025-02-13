import { validate } from 'schema-utils';
import type { OutputPluginConfig } from './types.js';

type Schema = Parameters<typeof validate>[0];

const ruleSchema: Schema = {
  anyOf: [
    { type: 'string' },
    { instanceof: 'RegExp' },
    {
      type: 'array',
      items: {
        anyOf: [{ type: 'string' }, { instanceof: 'RegExp' }],
      },
    },
  ],
};

const configSchema: Schema = {
  type: 'object',
  properties: {
    context: { type: 'string' },
    platform: { type: 'string' },
    enabled: { type: 'boolean' },
    output: {
      type: 'object',
      properties: {
        auxiliaryAssetsPath: { type: 'string' },
      },
      additionalProperties: true,
    },
    extraChunks: {
      type: 'array',
      items: {
        anyOf: [
          {
            type: 'object',
            properties: {
              test: ruleSchema,
              include: ruleSchema,
              exclude: ruleSchema,
              type: { const: 'remote' },
              outputPath: { type: 'string' },
            },
            required: ['type', 'outputPath'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              test: ruleSchema,
              include: ruleSchema,
              exclude: ruleSchema,
              type: { const: 'local' },
            },
            required: ['type'],
            additionalProperties: false,
          },
        ],
      },
    },
  },
  required: ['context', 'platform', 'output'],
  additionalProperties: false,
};

export function validateConfig(config: OutputPluginConfig) {
  validate(configSchema, config, { name: 'RepackOutputPlugin' });
}

export function getDeprecationMessages(config: OutputPluginConfig) {
  const deprecationMessages: string[] = [];

  if ('bundleFilename' in config.output) {
    deprecationMessages.push(
      '[NOTICE] `output.bundleFilename` is deprecated since Re.Pack v5.0.0. ' +
        'This option has no effect and will be removed in the next major version. ' +
        'Value passed through CLI flag `--bundle-output` always takes precedence.'
    );
  }

  if ('sourceMapFilename' in config.output) {
    deprecationMessages.push(
      '[NOTICE] `output.sourceMapFilename` is deprecated since Re.Pack v5.0.0. ' +
        'This option has no effect and will be removed in the next major version. ' +
        'Value passed through CLI flag `--sourcemap-output` always takes precedence.'
    );
  }

  if ('assetsPath' in config.output) {
    deprecationMessages.push(
      '[NOTICE] `output.assetsPath` is deprecated since Re.Pack v5.0.0. ' +
        'This option has no effect and will be removed in the next major version. ' +
        'Value passed through CLI flag `--assets-dest` always takes precedence.'
    );
  }

  return deprecationMessages;
}
