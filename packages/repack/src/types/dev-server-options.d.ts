import type { DevServerOptions } from '@callstack/repack-dev-server';
import type { RspackOptions } from '@rspack/core';

// extend webpack Configuration with devServer field
declare module 'webpack' {
  export interface Configuration {
    devServer?: DevServerOptions;
  }
}

// override rspack DevServer type
declare module '@rspack/core' {
  export interface Configuration extends RspackOptions {
    devServer?: DevServerOptions;
  }
}
