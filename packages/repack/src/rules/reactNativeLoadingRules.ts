import type { RuleSetRule } from '@rspack/core';
import { getModulePaths } from '../utils/getModulePaths';
import { REACT_NATIVE_LAZY_IMPORTS } from './lazyImports';

export const REACT_NATIVE_LOADING_RULES: RuleSetRule = {
  type: 'javascript/dynamic',
  test: /\.jsx?$/,
  include: [
    ...getModulePaths('react-native'),
    ...getModulePaths('@react-native'),
    ...getModulePaths('react-native-macos'),
    ...getModulePaths('react-native-windows'),
    ...getModulePaths('react-native-tvos'),
    ...getModulePaths('@callstack/react-native-visionos'),
  ],
  use: [
    {
      loader: 'builtin:swc-loader',
      options: {
        env: {
          targets: { 'react-native': '0.74' },
        },
        jsc: {
          parser: {
            syntax: 'ecmascript',
            jsx: true,
            exportDefaultFrom: true,
          },
          loose: true,
          externalHelpers: true,
        },
        module: {
          type: 'commonjs',
          strict: false,
          strictMode: false,
          lazy: REACT_NATIVE_LAZY_IMPORTS,
        },
      },
    },
    {
      loader: '@callstack/repack/flow-loader',
      options: { all: true },
    },
  ],
};
