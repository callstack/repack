import 'vitest';

declare module 'vitest' {
  export interface ProvidedContext {
    bundlerType: 'rspack' | 'webpack';
  }
}
