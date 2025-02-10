import { logger } from '@react-native-community/cli-tools';

export class NoStackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = `${message}`;
    logger.debug(this.stack ?? '');
    // Setting stack to undefined to avoid stack trace
    this.stack = undefined;
  }
}
