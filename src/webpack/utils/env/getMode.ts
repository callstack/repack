import { Fallback } from '../../../types';
import { getValueFromFallback } from './internal/getValueFromFallback';
import { parseCliOptions } from './internal/parseCliOptions';

export type Mode = 'production' | 'development';

export function getMode(
  fallback: Fallback<Mode> = { fallback: 'production' }
): Mode {
  const cliOptions = parseCliOptions();
  if (!cliOptions) {
    return getValueFromFallback(fallback);
  }

  if ('bundle' in cliOptions.arguments) {
    return cliOptions.arguments.bundle.dev ? 'development' : 'production';
  } else {
    return 'development';
  }
}
