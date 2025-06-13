import type {
  Compiler,
  DefinePlugin,
  RspackPluginInstance,
  RuleSetUse,
  RuleSetUseItem,
  SwcLoaderOptions,
} from '@rspack/core';
import type { CssToReactNativeRuntimeOptions } from 'react-native-css-interop/css-to-rn';

interface NativeWindPluginOptions {
  /** Force the platform passed to nativewind/preset.
  *  "native" (default) | "web" | undefined (use env as-is)
  */
  presetPlatform?: 'native' | 'web' | undefined;
  /**
   * Whether to check if the required dependencies are installed in the project.
   * If not, an error will be thrown. Defaults to `true`.
   */
  checkDependencies?: boolean;

  /**
   * Custom cssToReactNativeRuntime options.
   */
  cssInteropOptions?: Omit<CssToReactNativeRuntimeOptions, 'cache'>;
}

export class NativeWindPlugin implements RspackPluginInstance {
  constructor(private options: NativeWindPluginOptions = {}) {
    this.options.checkDependencies = this.options.checkDependencies ?? true;
  }

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

  private ensureDependencyInstalled(context: string, dependency: string) {
    try {
      require.resolve(dependency, { paths: [context] });
    } catch {
      const error = new Error(
        `[RepackNativeWindPlugin] Dependency named '${dependency}' is required but not found in your project. ` +
          'Did you forget to install it?'
      );
      // remove the stack trace to make the error more readable
      error.stack = undefined;
      throw error;
    }
  }

  private ensureNativewindDependenciesInstalled(context: string) {
    const dependencies = [
      'nativewind',
      'react-native-css-interop',
      'postcss',
      'postcss-loader',
      'tailwindcss',
      'autoprefixer',
    ];

    dependencies.forEach((dependency) => {
      this.ensureDependencyInstalled(context, dependency);
    });
  }

  apply(compiler: Compiler) {
    if (this.options.checkDependencies) {
      this.ensureNativewindDependenciesInstalled(compiler.context);
    }
    /** Pick the platform */
    const platform = this.options.presetPlatform ?? 'native';
    if (process.env.NATIVEWIND_OS === undefined) {
        process.env.NATIVEWIND_OS = platform;
    }

    /** Expose it at compile-time so tailwind.config.js can read it*/
    compiler.options.plugins ||= [];
    compiler.options.plugins.push(
        new DefinePlugin({
            'process.env.NATIVEWIND_OS': JSON.stringify(process.env.NATIVEWIND_OS),
        }),
    );

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
        {
          loader: '@callstack/repack-plugin-nativewind/loader',
          options: this.options.cssInteropOptions,
        },
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
