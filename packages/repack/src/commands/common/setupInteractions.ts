import readline from 'node:readline';
import { Logger } from '../../types';

function runOrReportUnsupported<Args extends Array<any>>(
  logger: Logger,
  message: string,
  fun?: (...args: Args) => void,
  ...args: Args
) {
  if (fun) {
    fun(...args);
    logger.info(message);
  } else {
    logger.warn(`${message} is not supported by the used bundler`);
  }
}

export function setupInteractions(
  handlers: {
    onReload?: () => void;
    onOpenDevMenu?: () => void;
    onOpenDevTools?: () => void;
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
    } else {
      switch (name) {
        case 'r':
          runOrReportUnsupported(logger, 'Reloading app', handlers.onReload);
          break;

        case 'd':
          runOrReportUnsupported(
            logger,
            'Opening developer menu',
            handlers.onOpenDevMenu
          );
          break;

        case 'j':
          runOrReportUnsupported(
            logger,
            'Opening DevTools',
            handlers.onOpenDevTools
              ? () => {
                  if (process.argv.includes('--experimental-debugger')) {
                    handlers.onOpenDevTools!();
                  } else {
                    logger.warn(
                      "DevTools require the '--experimental-debugger' flag to be passed to the bundler process"
                    );
                  }
                }
              : undefined
          );

          break;
      }
    }
  });
}
