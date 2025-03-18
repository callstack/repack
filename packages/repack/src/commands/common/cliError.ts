import { VERBOSE_ENV_KEY } from '../../env.js';

export class CLIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CLIError';

    // hide stack trace in non-verbose mode
    if (!process.env[VERBOSE_ENV_KEY]) {
      this.stack = undefined;
    }
  }
}
