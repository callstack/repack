import type { LoaderContext } from '@rspack/core';
import dedent from 'dedent';
import { cssToReactNativeRuntime } from 'react-native-css-interop/css-to-rn';
import { stringify } from './utils.js';

// biome-ignore lint/suspicious/noEmptyInterface: placeholder for options
interface NativeWindLoaderOptions {}

export const raw = false;

export default function nativeWindLoader(
  this: LoaderContext<NativeWindLoaderOptions>,
  source: string
) {
  this.cacheable();
  const callback = this.async();

  try {
    const jsCss = cssToReactNativeRuntime(source);
    const code = dedent`
      import { StyleSheet } from "nativewind";
      StyleSheet.registerCompiled((${stringify(jsCss)}));
    `;
    callback(null, code);
  } catch (error) {
    console.log(`Failed to convert ${this.resourcePath} to JS`, error);
    callback(error as Error);
  }
}
