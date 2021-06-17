import { Fallback } from '../../../types';
import { getFallbackFromOptions } from './internal/getFallbackFromOptions';
import { parseCliOptions } from './internal/parseCliOptions';

export function getPlatform(options: Fallback<string>): string {
  const cliOptions = parseCliOptions();
  if (!cliOptions) {
    return getFallbackFromOptions(options);
  }

  const args =
    'bundle' in cliOptions.arguments
      ? cliOptions.arguments.bundle
      : cliOptions.arguments.start;

  return args.platform;
}
