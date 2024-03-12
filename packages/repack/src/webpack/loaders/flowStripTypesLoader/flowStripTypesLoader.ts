import flowRemoveTypes from 'flow-remove-types';
import { LoaderContext } from '@rspack/core';

const ReactNativeTypesPath =
  /[/\\]react-native[/\\]Libraries[/\\]Renderer[/\\]shims[/\\]ReactNativeTypes\.js$/;
const NativeAppearancePath =
  /[/\\]react-native[/\\]Libraries[/\\]Utilities[/\\]NativeAppearance\.js$/;

export default function flowStripTypesLoader(
  this: LoaderContext,
  originalSource: string
) {
  this.cacheable();
  const callback = this.async();
  let source = originalSource;

  /* Overrides */
  /* ReactNativeTypes.js contains only types, and can be skipped safely */
  if (this.resourcePath.match(ReactNativeTypesPath)) {
    callback(null, '', '');
    return;
  }
  /* NativeAppearance.js is not being stripped properly */
  if (this.resourcePath.match(NativeAppearancePath)) {
    source = originalSource
      .split('\n')
      .filter((line) => !line.startsWith('export type '))
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

  callback(null, result.toString());
}
