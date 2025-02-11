import type { DevServerOptions } from '@callstack/repack-dev-server';

// extend webpack Configuration with devServer field
declare module 'webpack' {
  export interface Configuration {
    devServer?: DevServerOptions;
  }
}

// override rspack DevServer type
declare module '@rspack/core' {
  export interface DevServer extends DevServerOptions {}
}
