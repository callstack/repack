import { Fallback } from '../../../types';
import { getFallbackFromOptions } from './internal/getFallbackFromOptions';
import { parseCliOptions } from './internal/parseCliOptions';

export function isMinimizeEnabled(
  options: Fallback<boolean> = { fallback: false }
): boolean {
  const cliOptions = parseCliOptions();
  if (!cliOptions) {
    return getFallbackFromOptions(options);
  }

  if ('bundle' in cliOptions.arguments) {
    return (
      cliOptions.arguments.bundle.minify ?? !cliOptions.arguments.bundle.dev
    );
  } else {
    return getFallbackFromOptions(options);
  }
}
