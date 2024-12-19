import { transform } from '@babel/core';
import type { LoaderContext } from '@rspack/core';

interface NativeWindLoaderOptions {
  babelPlugins?: string[];
  input: string;
}

export const raw = false;

export default function nativeWindLoader(
  this: LoaderContext<NativeWindLoaderOptions>,
  source: string
) {
  this.cacheable();
  const callback = this.async();
  const options = this.getOptions();

  const babelPlugins = options.babelPlugins ?? [];

  transform(
    source,
    {
      filename: this.resourcePath,
      babelrc: false,
      configFile: false,
      compact: false,
      comments: true,
      plugins: [...babelPlugins],
      // , {
      //   runtime: "automatic",
      //   importSource: "react-native-css-interop",
      // }
      // presets: ['nativewind/preset'],
    },
    (err, result) => {
      if (err) {
        console.log('@@@ NativeWindLoader ERROR', err);
        callback(err);
        return;
      }
      // console.log('@@@ NativeWindLoader', result?.code);
      // @ts-ignore
      callback(null, result.code, result.map);
      return;
    }
  );
}
