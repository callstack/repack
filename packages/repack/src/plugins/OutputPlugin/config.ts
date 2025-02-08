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
        bundleFilename: { type: 'string' },
        sourceMapFilename: { type: 'string' },
        assetsPath: { type: 'string' },
        auxiliaryAssetsPath: { type: 'string' },
      },
      additionalProperties: false,
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
  validate(configSchema, config, { name: 'OutputPlugin' });
}
