import * as React from 'react';
import { Console, Hook, Unhook } from 'console-feed';
import { Message } from 'console-feed/lib/definitions/Component';
import { PageLayout } from '../../components/PageLayout';
import { useDevServer } from '../../hooks/useDevServer';
import { Admonition } from '../../components/Admonition';
import { ActionsBar } from './ActionsBar';
import './ServerLogs.scss';

const MAX_LOGS_COUNT = 500;
const STORAGE_KEY = 'Re.Pack.ServerLogs';
const BOTTOM_ACTION_BAR_THRESHOLD = 15;

const serverConsole = {
  log() {},
  info() {},
  warn() {},
  error() {},
  debug() {},
} as typeof console;

export function ServerLogs() {
  const [logs, setLogs] = React.useState<Message[]>(
    JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]')
  );
  const shouldScrollToBottom = React.useRef(true);

  const clearLogs = React.useCallback(() => {
    setLogs([]);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  const scrollToBottom = React.useCallback(() => {
    window.scrollTo(0, document.body.scrollHeight);
  }, []);

  const scrollToTop = React.useCallback(() => {
    window.scrollTo(0, 0);
  }, []);

  const { getProxyConnection } = useDevServer();

  React.useEffect(() => {
    const subscription = getProxyConnection().subscribe({
      next: (event) => {
        if (event.type === 'message' && event.payload.kind === 'server-log') {
          const [log, ...rest] = event.payload.log.message;
          const args = [];
          if (typeof log !== 'string' && 'msg' in log) {
            const { msg, ...payload } = log;
            if (Array.isArray(msg)) {
              args.push(...msg, payload, ...rest);
            } else {
              args.push(msg, payload, ...rest);
            }
          } else {
            args.push(log, ...rest);
          }

          serverConsole[event.payload.log.type](
            `[${
              new Date(event.payload.log.timestamp).toISOString().split('T')[1]
            }] ${event.payload.log.issuer}:`,
            ...args
          );
        }
      },
    });

    return () => subscription.unsubscribe();
  }, [getProxyConnection]);

  React.useEffect(() => {
    Hook(
      serverConsole as any,
      (log) => {
        setLogs((currLogs) => {
          const logs = [...currLogs, log as Message];
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
          return logs;
        });
      },
      false
    );

    return () => {
      Unhook(serverConsole as any);
    };
  }, []);

  React.useEffect(() => {
    if (shouldScrollToBottom.current) {
      scrollToBottom();
    }
  }, [scrollToBottom, logs]);

  React.useEffect(() => {
    const onScroll = () => {
      shouldScrollToBottom.current =
        window.scrollY + window.innerHeight + 100 >= document.body.scrollHeight;
    };

    window.addEventListener('scroll', onScroll);

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const hasLogs = logs.length > 0;

  return (
    <PageLayout title="Server logs">
      <div className="ConsoleFeed flex flex-col">
        {!hasLogs ? (
          <Admonition type="info" className="mt-2">
            There are no logs yet.
          </Admonition>
        ) : null}
        {React.useMemo(
          () =>
            hasLogs ? (
              <ActionsBar
                label={`Showing last ${MAX_LOGS_COUNT} logs.`}
                position="top"
                onClear={clearLogs}
                onScroll={scrollToBottom}
              />
            ) : null,
          [clearLogs, hasLogs, scrollToBottom]
        )}
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
        {logs.length > BOTTOM_ACTION_BAR_THRESHOLD ? (
          <ActionsBar
            label={`Showing last ${MAX_LOGS_COUNT} logs.`}
            position="bottom"
            onClear={clearLogs}
            onScroll={scrollToTop}
          />
        ) : null}
      </div>
    </PageLayout>
  );
}
