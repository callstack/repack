import type { Compiler, RspackPluginInstance } from '@rspack/core';

export class NativeWindPlugin implements RspackPluginInstance {
  apply(compiler: Compiler) {
    // add rules for transpiling wih NativeWind loader
    compiler.options.module.rules.push({
      test: /\.css$/,
      use: [
        '@callstack/repack-plugin-nativewind/loader',
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
