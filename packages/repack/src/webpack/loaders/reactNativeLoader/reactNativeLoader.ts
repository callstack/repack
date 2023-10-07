import flowRemoveTypes from 'flow-remove-types';

import { LoaderContext } from '@rspack/core';

const REACT_NATIVE_VIEW_CONFIG_REGISTRY_REGEXP =
  /node_modules(.*[/\\])+react-native[/\\]Libraries[/\\]Renderer[/\\]shims[/\\]ReactNativeViewConfigRegistry/;

export default function reactNativeLoader(
  this: LoaderContext,
  originalSource: string,
  sourceMap: string
) {
  this.cacheable();
  const callback = this.async();

  let source = originalSource;

  /**
   * Inside ReactNativeViewConfigRegistry there is a mix of CJS and ESM import/export syntax
   * which confuses swc. This transformation is required to force the file to be parsed as CJS.
   * This is done in a way that doesn't affect the source-maps (the amount of characters in each
   * line is preserved).
   */
  if (this.currentRequest.match(REACT_NATIVE_VIEW_CONFIG_REGISTRY_REGEXP)) {
    source = source
      .split('\n')
      .map((line) => {
        /** replace flow type import with whitespace */
        if (line.startsWith('import {type ViewConfig}')) {
          return ' '.repeat(line.length);
        }
        /** replace ESM import syntax with CJS require() */
        if (line.startsWith("import invariant from 'invariant';")) {
          return "let invariant=require('invariant')";
        }
        return line;
      })
      .join('\n');
  }

  /**
   *  Transforming React-Native requires us to use the `all` option, which
   *  removes all Flow annotations, as not all files are marked with `@flow`
   *  pragma. This can potentially be fixed via a PR to the core of RN.
   *
   *  IgnoreUninitializedFields is required to avoid errors (most notably in
   *  places where event-target-shim is used) that occur when Flow types are
   *  stripped from uninitialized fields. This flag removes the uninitialized
   *  fields from the output. This can be fixed by using `declare` in front of them.
   *  Also possible to fix via a PR to the core of RN.
   */
  const result = flowRemoveTypes(source, {
    all: true,
    ignoreUninitializedFields: true,
  });

  callback(null, result.toString(), sourceMap);
}
