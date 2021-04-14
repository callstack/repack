import { CLI_OPTIONS_ENV_KEY } from '../../../../env';
import { CliOptions } from '../../../../types';

export function parseCliOptions(): CliOptions | undefined {
  const rawCliOptions = process.env[CLI_OPTIONS_ENV_KEY];
  if (!rawCliOptions) {
    return undefined;
  }
  return JSON.parse(rawCliOptions);
}
