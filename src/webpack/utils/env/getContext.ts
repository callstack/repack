import { Fallback } from '../../../types';
import { getFallbackFromOptions } from './internal/getFallbackFromOptions';
import { parseCliOptions } from './internal/parseCliOptions';

export function getContext(
  options: Fallback<string> = { fallback: process.cwd() }
): string {
  const cliOptions = parseCliOptions();
  if (!cliOptions) {
    return getFallbackFromOptions(options);
  }

  return cliOptions.config.root;
}
