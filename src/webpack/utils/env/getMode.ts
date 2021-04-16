import { Fallback } from '../../../types';
import { getFallbackFromOptions } from './internal/getFallbackFromOptions';
import { parseCliOptions } from './internal/parseCliOptions';

export type Mode = 'production' | 'development';

export function getMode(
  options: Fallback<Mode> = { fallback: 'production' }
): Mode {
  const cliOptions = parseCliOptions();
  if (!cliOptions) {
    return getFallbackFromOptions(options);
  }

  if ('bundle' in cliOptions.arguments) {
    return cliOptions.arguments.bundle.dev ? 'development' : 'production';
  } else {
    return 'development';
  }
}
