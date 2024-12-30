import type { Compiler, RspackPluginInstance } from '@rspack/core';

export class NativeWindPlugin implements RspackPluginInstance {
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
        {
          loader: '@callstack/repack-plugin-nativewind/loader',
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
  }
}
