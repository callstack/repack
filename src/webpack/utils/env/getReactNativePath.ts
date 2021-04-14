import { Fallback } from '../../../types';
import { getValueFromFallback } from './internal/getValueFromFallback';
import { parseCliOptions } from './internal/parseCliOptions';

export function getReactNativePath(
  fallback: Fallback<string> = { fallback: require.resolve('react-native') }
): string {
  const cliOptions = parseCliOptions();
  if (!cliOptions) {
    return getValueFromFallback(fallback);
  }

  return cliOptions.config.reactNativePath;
}
