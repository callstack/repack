import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    {
      format: 'esm',
      syntax: 'es2021',
      dts: false,
      source: {
        entry: {
          bin: 'src/bin.ts',
        },
      },
      output: {
        minify: true,
      },
    },
  ],
});
