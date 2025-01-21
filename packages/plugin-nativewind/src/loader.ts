import type { LoaderContext } from '@rspack/core';
import dedent from 'dedent';
import {
  type CssToReactNativeRuntimeOptions,
  cssToReactNativeRuntime,
} from 'react-native-css-interop/css-to-rn';
import { stringify } from './utils.js';

interface NativeWindLoaderOptions
  extends Omit<CssToReactNativeRuntimeOptions, 'cache'> {}

export const raw = false;

export default function nativeWindLoader(
  this: LoaderContext<NativeWindLoaderOptions>,
  source: string
) {
  this.cacheable();
  const callback = this.async();

  try {
    const options = this.getOptions();
    const jsCss = cssToReactNativeRuntime(source, options);
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
