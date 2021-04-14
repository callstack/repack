import { Fallback } from '../../../types';
import { getValueFromFallback } from './internal/getValueFromFallback';
import { parseCliOptions } from './internal/parseCliOptions';

export function getPlatform(fallback: Fallback<string>): string {
  const cliOptions = parseCliOptions();
  if (!cliOptions) {
    return getValueFromFallback(fallback);
  }

  const args =
    'bundle' in cliOptions.arguments
      ? cliOptions.arguments.bundle
      : cliOptions.arguments.start;

  return args.platform;
}
