import { Fallback } from '../../../types';
import { getValueFromFallback } from './internal/getValueFromFallback';
import { parseCliOptions } from './internal/parseCliOptions';

export function isMinimizeEnabled(
  fallback: Fallback<boolean> = { fallback: false }
): boolean {
  const cliOptions = parseCliOptions();
  if (!cliOptions) {
    return getValueFromFallback(fallback);
  }

  if ('bundle' in cliOptions.arguments) {
    return (
      cliOptions.arguments.bundle.minify ?? !cliOptions.arguments.bundle.dev
    );
  } else {
    return getValueFromFallback(fallback);
  }
}
