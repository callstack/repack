import type {
  Compiler,
  RspackPluginInstance,
  RuleSetUse,
  RuleSetUseItem,
  SwcLoaderOptions,
} from '@rspack/core';

export class NativeWindPlugin implements RspackPluginInstance {
  private configureSwcLoaderForNativeWind(
    swcOptions: SwcLoaderOptions = {}
  ): SwcLoaderOptions {
    const options = structuredClone(swcOptions);

    options.jsc = options.jsc ?? {};
    options.jsc.transform = options.jsc.transform ?? {};
    options.jsc.transform.react = options.jsc.transform.react ?? {};
    options.jsc.transform.react.runtime = 'automatic';
    options.jsc.transform.react.importSource = 'nativewind';

    return options;
  }

  private handleRuleUseField(ruleUseField: RuleSetUse): RuleSetUse {
    if (Array.isArray(ruleUseField)) {
      return ruleUseField.map((item) => this.handleRuleUseField(item)) as Array<
        string | RuleSetUseItem
      >;
    }

    if (typeof ruleUseField === 'function') {
      console.warn(
        '[RepackNativeWindPlugin] Dynamic loader configurations using functions are not supported. ' +
          'If you are using builtin:swc-loader, please manually set jsc.transform.react.importSource to "nativewind" in its configuration.'
      );
    } else if (typeof ruleUseField === 'string') {
      if (ruleUseField === 'builtin:swc-loader') {
        return {
          loader: 'builtin:swc-loader',
          options: this.configureSwcLoaderForNativeWind({}),
        };
      }
    } else if (ruleUseField.loader === 'builtin:swc-loader') {
      ruleUseField.options = this.configureSwcLoaderForNativeWind(
        ruleUseField.options as SwcLoaderOptions
      );
    }

    return ruleUseField;
  }

  private handleRuleOptionsField(
    ruleOptionsField: SwcLoaderOptions
  ): SwcLoaderOptions {
    return this.configureSwcLoaderForNativeWind(ruleOptionsField);
  }

  apply(compiler: Compiler) {
    /**
     * First, we need to process the CSS files using PostCSS.
     * The PostCSS loader will use Tailwind CSS to generate the necessary utility classes
     * based on the content of the project files. It will also use Autoprefixer to add vendor prefixes.
     * Finally, we need to convert the CSS to something React Native can process using a utility
     * from nativewind (this is handled inside the repack-plugin-nativewind/loader).
     *
     * NOTE: loaders are run in reverse order, so the last loader in the array will be run first.
     */
    compiler.options.module.rules.push({
      test: /\.css$/,
      use: [
        { loader: '@callstack/repack-plugin-nativewind/loader' },
        {
          loader: 'postcss-loader',
          options: {
            postcssOptions: {
              plugins: {
                tailwindcss: {},
                autoprefixer: {},
              },
            },
          },
        },
      ],
    });

    /**
     * Second, we need to configure the `builtin:swc-loader` to properly handle NativeWind's JSX transformations.
     * We look for any instances of the `builtin:swc-loader` in the Rspack configuration and modify their options
     * to include the NativeWind react import source.
     */
    compiler.options.module.rules.forEach((rule) => {
      if (!rule || typeof rule !== 'object') {
        return;
      }

      if ('use' in rule && rule.use !== undefined) {
        rule.use = this.handleRuleUseField(rule.use);
      }

      if ('loader' in rule && rule.loader === 'builtin:swc-loader') {
        rule.options = this.handleRuleOptionsField(
          rule.options as SwcLoaderOptions
        );
      }
    });
  }
}
