import { VERBOSE_ENV_KEY } from '../../env.js';

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';

    // hide stack trace in non-verbose mode
    if (!process.env[VERBOSE_ENV_KEY]) {
      this.stack = undefined;
    }
  }
}
