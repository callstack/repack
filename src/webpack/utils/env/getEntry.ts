import path from 'path';
import { Fallback } from '../../../types';
import { getValueFromFallback } from './internal/getValueFromFallback';
import { parseCliOptions } from './internal/parseCliOptions';

export function getEntry(
  fallback: Fallback<string> = { fallback: './index.js' }
): string {
  const cliOptions = parseCliOptions();
  if (!cliOptions) {
    return getValueFromFallback(fallback);
  }

  if ('bundle' in cliOptions.arguments) {
    const { entryFile } = cliOptions.arguments.bundle;
    return path.isAbsolute(entryFile) || entryFile.startsWith('./')
      ? entryFile
      : `./${entryFile}`;
  } else {
    return getValueFromFallback(fallback);
  }
}
