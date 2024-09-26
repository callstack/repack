import readline from 'node:readline';
import { yellow, blueBright, italic } from 'colorette';
import { Logger } from '../../types';
import { EXPERIMENTAL_DEBUGGER_FLAG } from '../consts';

type Interaction = {
  /**
   * The function to be executed when this interaction's keystroke is sent.
   *
   * @default undefined
   */
  action?: () => void;

  /**
   * The message to be displayed when the action is performed.
   */
  postPerformMessage: string;

  /**
   * The name of this interaction.
   */
  helpName: string;

  /**
   * The explanation why this action is not supported at runtime; will be displayed in help
   * listing of interactions if provided.
   *
   * Will be logged in help listing of interactions as: `... (unsupported, ${actionUnsupportedExplanation})`.
   *
   * Will be logged in post-perform as: `${helpName} is not supported ${actionUnsupportedExplanation ?? 'by the used bundler'}`.
   *
   * @default undefined
   */
  actionUnsupportedExplanation?: string;
};

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

  // since now Re.pack officially supports RN >= 0.73, it is sure that RN
  // has the capability of the new debugger
  const hasExperimentalDebuggerSupport = process.argv.includes(
    EXPERIMENTAL_DEBUGGER_FLAG
  );

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
      action: handlers.onOpenDevTools
        ? () => {
            if (hasExperimentalDebuggerSupport) {
              handlers.onOpenDevTools!();
            } else {
              logger.warn(
                `DevTools require the '${EXPERIMENTAL_DEBUGGER_FLAG}' flag to be passed to the bundler process`
              );
            }
          }
        : undefined,
      postPerformMessage: 'Opening DevTools',
      helpName: 'Open DevTools',
      actionUnsupportedExplanation: hasExperimentalDebuggerSupport
        ? undefined
        : `${EXPERIMENTAL_DEBUGGER_FLAG} was not passed`,
    },
  };

  console.log(blueBright('You can use the following keystrokes:'));
  for (const [key, interaction] of Object.entries(plainInteractions)) {
    const isSupported =
        interaction?.actionUnsupportedExplanation === undefined &&
        interaction?.action !== undefined,
      text = `${key}: ${interaction?.helpName}${isSupported ? '' : yellow(` (unsupported${interaction?.actionUnsupportedExplanation ? `, ${interaction.actionUnsupportedExplanation}` : 'by the current bundler'})`)}`;

    console.log(isSupported ? text : italic(text));
  }

  console.log('');
  console.log('Press ctrl+c or ctrl+z to quit the dev server');
  console.log('');
}
