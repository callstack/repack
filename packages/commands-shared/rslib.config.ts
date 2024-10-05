import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    {
      dts: {
        bundle: true,
      },
      format: 'esm',
      source: {
        tsconfigPath: 'tsconfig.build.json',
      },
      syntax: 'es2021',
    },
  ],
  output: {
    target: 'node',
    minify: false,
  },
});
