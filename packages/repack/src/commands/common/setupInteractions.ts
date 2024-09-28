import readline from 'node:readline';
import { Logger } from '../../types';

export function setupInteractions(
  handlers: {
    onReload?: () => void;
    onOpenDevMenu?: () => void;
  },
  logger: Logger = console
) {
  if (!process.stdin.setRawMode) {
    logger.warn('Interactive mode is not supported in this environment');
    return;
  }

  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);

  process.stdin.on('keypress', (_key, data) => {
    const { ctrl, name } = data;
    if (ctrl === true) {
      switch (name) {
        case 'c':
          process.exit();
          break;
        case 'z':
          process.emit('SIGTSTP', 'SIGTSTP');
          break;
      }
    } else if (name === 'r') {
      handlers.onReload?.();
      logger.info('Reloading app');
    } else if (name === 'd') {
      handlers.onOpenDevMenu?.();
      logger.info('Opening developer menu');
    }
  });
}
