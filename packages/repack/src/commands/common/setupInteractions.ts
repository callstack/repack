import nodeReadline from 'node:readline';
import * as colorette from 'colorette';
import type { Logger } from '../../types.js';

type Interaction = {
  // The function to be executed when this interaction's keystroke is sent.
  action?: () => void;

  // The message to be displayed when the action is performed.
  postPerformMessage: string;

  // The name of this interaction.
  helpName: string;

  // The explanation why this action is not supported at runtime; will be displayed in help listing of interactions if provided.
  actionUnsupportedExplanation?: string;
};

export function setupInteractions(
  handlers: {
    onReload?: () => void;
    onOpenDevMenu?: () => void;
    onOpenDevTools?: () => void;
    onAdbReverse?: () => void;
  },
  options?: {
    logger?: Logger;
    process?: NodeJS.Process;
    readline?: typeof nodeReadline;
  }
) {
  const logger = options?.logger ?? console;
  const process = options?.process ?? global.process;
  const readline = options?.readline ?? nodeReadline;

  if (!process.stdin.setRawMode) {
    logger.warn('Interactive mode is not supported in this environment');
    return;
  }

  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);

  // graceful shutdown
  process.on('SIGINT', () => {
    process.exit();
  });

  process.stdin.on('keypress', (_key, data) => {
    const { ctrl, name } = data;
    if (ctrl === true) {
      switch (name) {
        case 'c':
          process.emit('SIGINT', 'SIGINT');
          break;

        case 'z':
          process.emit('SIGTSTP', 'SIGTSTP');
          break;
      }
    } else {
      const interaction = plainInteractions[name];

      if (interaction) {
        const {
          action,
          postPerformMessage,
          helpName,
          actionUnsupportedExplanation,
        } = interaction;

        if (action && actionUnsupportedExplanation === undefined) {
          logger.info(postPerformMessage);

          action();
        } else {
          logger.warn(
            `${helpName} is not supported ${actionUnsupportedExplanation ?? 'by the used bundler'}`
          );
        }
      }
    }
  });

  const plainInteractions: Record<string, Interaction | undefined> = {
    r: {
      action: handlers.onReload,
      postPerformMessage: 'Reloading app',
      helpName: 'Reload app',
    },
    d: {
      action: handlers.onOpenDevMenu,
      postPerformMessage: 'Opening developer menu',
      helpName: 'Open developer menu',
    },
    j: {
      action: handlers.onOpenDevTools,
      postPerformMessage: 'Opening debugger',
      helpName: 'Open debugger',
    },
    a: {
      action: handlers.onAdbReverse,
      postPerformMessage: 'Running adb reverse',
      helpName: 'Run adb reverse',
    },
  };

  // use process.stdout for sync output at startup
  for (const [key, interaction] of Object.entries(plainInteractions)) {
    const isSupported =
      interaction?.actionUnsupportedExplanation === undefined &&
      interaction?.action !== undefined;
    const text = ` ${colorette.bold(key)}: ${interaction?.helpName}${isSupported ? '' : colorette.yellow(` (unsupported${interaction?.actionUnsupportedExplanation ? `, ${interaction.actionUnsupportedExplanation}` : ' by the current bundler'})`)}\n`;

    process.stdout.write(isSupported ? text : colorette.italic(text));
  }
  process.stdout.write('\nPress Ctrl+c or Ctrl+z to quit the dev server\n\n');
}
