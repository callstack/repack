import { getModulePaths } from '../utils/getModulePaths.js';

const FLOW_TYPED_MODULES = [
  'react-native',
  '@react-native',
  'react-native-macos',
  'react-native-windows',
  'react-native-tvos',
  '@callstack/react-native-visionos',
  'react-native-blob-util',
  'react-native-pdf',
  '@react-native-picker/picker',
  'react-native-config',
  'react-native-fs',
  'react-native-image-size',
  'react-native-performance',
  'react-native-vector-icons',
  '@react-native-community/datetimepicker',
  'react-native-linear-gradient',
  'react-native-inappbrowser-reborn',
  'react-native-camera',
  'react-native-view-shot',
];

/**
 * Creates webpack/rspack rules configuration for handling Flow type annotations in JavaScript files.
 * The rules will use flow-loader to remove Flow types from the code before other processing.
 *
 * @param options Configuration options
 * @param options.include Array of module names to include for Flow transformation (defaults to predefined FLOW_TYPED_MODULES)
 * @param options.exclude Array of module names to exclude from Flow transformation (defaults to empty array)
 * @param options.all If true, bypasses looking for @flow pragma comment before parsing (defaults to true)
 * @param options.ignoreUninitializedFields If true, removes uninitialized class fields completely rather than only removing the type (defaults to false)
 *
 * @example
 * // In your rspack/webpack config:
 * const { getFlowTransformRules } = require('@callstack/repack');
 *
 * module.exports = {
 *   module: {
 *     rules: [
 *       ...getFlowTransformRules({
 *         include: ['react-native', '@react-native'],
 *         all: true,
 *         ignoreUninitializedFields: false
 *       })
 *     ]
 *   }
 * };
 */
interface GetFlowTransformRulesOptions {
  include?: string[];
  exclude?: string[];
  all?: boolean;
  ignoreUninitializedFields?: boolean;
}

export function getFlowTransformRules({
  include = FLOW_TYPED_MODULES,
  exclude = [],
  all = true,
  ignoreUninitializedFields = false,
}: GetFlowTransformRulesOptions = {}) {
  return [
    {
      type: 'javascript/auto',
      test: /\.(jsx?|flow)$/,
      include: getModulePaths(include),
      exclude: getModulePaths(exclude),
      use: {
        loader: '@callstack/repack/flow-loader',
        options: { all, ignoreUninitializedFields },
      },
    },
  ];
}
