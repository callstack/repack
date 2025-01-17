import type { Compiler, RspackPluginInstance, RuleSetRule } from '@rspack/core';
import { isRspackCompiler } from './utils/isRspackCompiler.js';

const CODEGEN_RULE = {
  test: /(?:^|[\\/])(?:Native\w+|(\w+)NativeComponent)\.[jt]sx?$/,
  // make sure this runs first so that the flow types are intact
  // since hermes-parser strips all comments
  enforce: 'pre',
  type: 'javascript/auto',
  use: {
    loader: 'babel-loader',
    options: {
      babelrc: false,
      configFile: false,
      parserOpts: {
        // hermes-parser strips all comments so the information about flow pragma is lost
        // assume flow when dealing with JS files as a workaround
        flow: 'all',
      },
      plugins: [
        'babel-plugin-syntax-hermes-parser',
        ['@babel/plugin-syntax-typescript', false],
        '@react-native/babel-plugin-codegen',
      ],
      // config merging reference: https://babeljs.io/docs/options#pluginpreset-entries
      overrides: [
        {
          test: /\.ts$/,
          plugins: [
            [
              '@babel/plugin-syntax-typescript',
              { isTSX: false, allowNamespaces: true },
            ],
          ],
        },
        {
          test: /\.tsx$/,
          plugins: [
            [
              '@babel/plugin-syntax-typescript',
              { isTSX: true, allowNamespaces: true },
            ],
          ],
        },
      ],
      // source maps are usually set based on the devtool option in config
      // Re.Pack templates disable the devtool by default and the flag in loader is not set
      // we need to enable sourcemaps for the loader explicitly here
      sourceMaps: true,
    },
  },
} as const satisfies RuleSetRule;

/**
 * Plugin for handling React Native codegen transforms required by the new architecture.
 *
 * @category Webpack Plugin
 */
export class CodegenPlugin implements RspackPluginInstance {
  private ensureReactNativeCodegenInstalled(context: string) {
    try {
      require.resolve('@react-native/babel-plugin-codegen', {
        paths: [context],
      });
    } catch {
      throw new Error(
        "CodegenPlugin requires '@react-native/babel-preset' to be present in your project. " +
          'Did you forget to install it?'
      );
    }
  }

  private ensureHermesParserSyntaxPluginInstalled(context: string) {
    try {
      require.resolve('babel-plugin-syntax-hermes-parser', {
        paths: [context],
      });
    } catch {
      throw new Error(
        "CodegenPlugin requires 'babel-plugin-syntax-hermes-parser' to be present in your project. " +
          'Did you forget to install it?'
      );
    }
  }

  apply(compiler: Compiler) {
    if (!isRspackCompiler(compiler)) {
      // webpack uses RN babel preset, so we don't need to do anything here
      return;
    }

    this.ensureHermesParserSyntaxPluginInstalled(compiler.context);
    this.ensureReactNativeCodegenInstalled(compiler.context);

    compiler.options.module.rules.push(CODEGEN_RULE);
  }
}
