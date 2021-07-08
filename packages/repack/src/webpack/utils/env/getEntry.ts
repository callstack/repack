import path from 'path';
import { Fallback } from '../../../types';
import { getFallbackFromOptions } from './internal/getFallbackFromOptions';
import { parseCliOptions } from './internal/parseCliOptions';

export function getEntry(
  options: Fallback<string> = { fallback: './index.js' }
): string {
  const cliOptions = parseCliOptions();
  if (!cliOptions) {
    return getFallbackFromOptions(options);
  }

  if ('bundle' in cliOptions.arguments) {
    const { entryFile } = cliOptions.arguments.bundle;
    return path.isAbsolute(entryFile) || entryFile.startsWith('./')
      ? entryFile
      : `./${entryFile}`;
  } else {
    return getFallbackFromOptions(options);
  }
}
