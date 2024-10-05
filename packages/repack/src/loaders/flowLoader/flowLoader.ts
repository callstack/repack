import type { LoaderContext } from '@rspack/core';
import flowRemoveTypes from 'flow-remove-types';
import { getOptions } from './options';

export const raw = false;

export default function flowLoader(this: LoaderContext, source: string) {
  this.cacheable();
  const callback = this.async();
  const options = getOptions(this);

  const result = flowRemoveTypes(source, options);
  const sourceMap = options.pretty ? result.generateMap() : undefined;

  callback(null, result.toString(), sourceMap);
}
