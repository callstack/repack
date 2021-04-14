import { Fallback } from '../../../types';
import { getValueFromFallback } from './internal/getValueFromFallback';
import { parseCliOptions } from './internal/parseCliOptions';

export function getContext(
  fallback: Fallback<string> = { fallback: process.cwd() }
): string {
  const cliOptions = parseCliOptions();
  if (!cliOptions) {
    return getValueFromFallback(fallback);
  }

  return cliOptions.config.root;
}
