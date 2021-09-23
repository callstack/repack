import * as React from 'react';
import { Console, Hook, Unhook } from 'console-feed';
import { Message } from 'console-feed/lib/definitions/Component';
import { PageLayout } from '../../components/PageLayout';
import { ActionsBar } from './ActionsBar';
import './ServerLogs.scss';

const MAX_LOGS_COUNT = 500;

const customConsole = {
  log() {},
  info() {},
  warn() {},
  error() {},
  debug() {},
} as typeof console;

export function ServerLogs() {
  const [logs, setLogs] = React.useState<Message[]>([]);

  const clearLogs = React.useCallback(() => {
    setLogs([]);
  }, []);

  React.useEffect(() => {
    Hook(
      customConsole as any,
      (log) => setLogs((currLogs) => [...currLogs, log as Message]),
      false
    );

    setTimeout(() => {
      for (let i = 0; i < MAX_LOGS_COUNT / 5; i++) {
        customConsole.log('[07:39:29.881Z] hello world', i);
        customConsole.info('[07:39:30.881Z] hello world', i);
        customConsole.warn('[07:39:31.881Z] hello world', i);
        customConsole.error('[07:39:32.881Z] hello world', i);
        customConsole.debug('[07:39:33.881Z] hello world', i, {
          payload: { msg: 'Re.Pack' },
          i,
        });
      }
    }, 100);

    return () => {
      Unhook(customConsole as any);
    };
  }, []);

  return (
    <PageLayout title="Server logs">
      <div className="ConsoleFeed flex flex-col">
        <ActionsBar
          label={`Showing last ${MAX_LOGS_COUNT} logs.`}
          position="top"
          onClear={clearLogs}
          onScroll={() => {}}
        />
        <Console
          logs={logs}
          variant="dark"
          styles={React.useMemo(
            () => ({
              BASE_FONT_FAMILY: "'Roboto Mono', monospace",
              BASE_FONT_SIZE: '1rem',
              BASE_LINE_HEIGHT: '1.5rem',
              BASE_BACKGROUND_COLOR: 'transparent',
              LOG_BACKGROUND: 'rgb(10, 11, 11)',
              PADDING: '6px 4px',
              LOG_ICON_WIDTH: '20px',
              LOG_ICON_HEIGHT: 'auto',
              LOG_ICON_BACKGROUND_SIZE: '20px',
              LOG_INFO_ICON: '',
              LOG_WARN_ICON: '',
              LOG_WARN_BORDER: '',
              LOG_WARN_BACKGROUND: '#423d21',
              LOG_ERROR_ICON: '',
              LOG_ERROR_BORDER: '',
              LOG_ERROR_BACKGROUND: '#571f1f',
              LOG_DEBUG_ICON: '',
            }),
            []
          )}
        />
        {logs.length > 20 ? (
          <ActionsBar
            label={`Showing last ${MAX_LOGS_COUNT} logs.`}
            position="bottom"
            onClear={clearLogs}
            onScroll={() => {}}
          />
        ) : null}
      </div>
    </PageLayout>
  );
}
