import { VERBOSE_ENV_KEY } from '../env.js';
import { isTruthyEnv } from './helpers.js';

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';

    // hide stack trace in non-verbose mode
    if (!isTruthyEnv(process.env[VERBOSE_ENV_KEY])) {
      this.stack = undefined;
    }
  }
}

export class CLIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CLIError';

    // hide stack trace in non-verbose mode
    if (!isTruthyEnv(process.env[VERBOSE_ENV_KEY])) {
      this.stack = undefined;
    }
  }
}
