import { Fallback } from '../../../../types';

export function getValueFromFallback<T>({ fallback }: Fallback<T>): T {
  return 'call' in fallback ? fallback.call(undefined) : fallback;
}
