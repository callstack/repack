import { Fallback } from '../../../../types';

export function getFallbackFromOptions<T>({ fallback }: Fallback<T>): T {
  return fallback instanceof Function && 'call' in fallback
    ? fallback.call(undefined)
    : fallback;
}
