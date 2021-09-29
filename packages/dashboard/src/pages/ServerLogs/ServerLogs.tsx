import * as React from 'react';
import { Console, Hook, Unhook } from 'console-feed';
import { Message } from 'console-feed/lib/definitions/Component';
import { PageLayout } from '../../components/PageLayout';
import { useDevServer } from '../../hooks/useDevServer';
import { useServerLogs } from '../../hooks/useServerLogs';
import { Admonition } from '../../components/Admonition';
import { LogEntry } from '../../types';
import { ActionsBar } from './ActionsBar';
import './ServerLogs.scss';

const MAX_LOGS_COUNT = 500;
const BOTTOM_ACTION_BAR_THRESHOLD = 15;

const serverConsole = {
  log() {},
  info() {},
  warn() {},
  error() {},
  debug() {},
} as typeof console;

export function ServerLogs() {
  const { getProxyConnection } = useDevServer();
  const { data: bufferedLogs, loading } = useServerLogs();
  const [logs, setLogs] = React.useState<Message[]>([]);
  const shouldScrollToBottom = React.useRef(true);

  const clearLogs = React.useCallback(() => {
    setLogs([]);
  }, []);

  const scrollToBottom = React.useCallback(() => {
    window.scrollTo(0, document.body.scrollHeight);
  }, []);

  const scrollToTop = React.useCallback(() => {
    window.scrollTo(0, 0);
  }, []);

  const processLog = React.useCallback((log: LogEntry) => {
    const [arg0, ...rest] = log.message;
    const args = [];
    if (typeof arg0 !== 'string' && 'msg' in arg0) {
      const { msg, ...payload } = arg0;
      if (Array.isArray(msg)) {
        args.push(...msg, payload, ...rest);
      } else {
        args.push(msg, payload, ...rest);
      }
    } else {
      args.push(arg0, ...rest);
    }

    serverConsole[log.type](
      `[${new Date(log.timestamp).toISOString().split('T')[1]}] ${log.issuer}:`,
      ...args
    );
  }, []);

  React.useEffect(() => {
    if (!loading) {
      for (const log of bufferedLogs ?? []) {
        processLog(log);
      }
    }
  }, [bufferedLogs, loading, processLog]);

  React.useEffect(() => {
    const subscription = getProxyConnection().subscribe({
      next: (event) => {
        if (event.type === 'message' && event.payload.kind === 'server-log') {
          processLog(event.payload.log);
        }
      },
    });

    return () => subscription.unsubscribe();
  }, [getProxyConnection, processLog]);

  React.useEffect(() => {
    Hook(
      serverConsole as any,
      (log) => {
        setLogs((currLogs) => [...currLogs, log as Message]);
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
        {loading ? (
          <Admonition type="progress" className="mt-2">
            Checking logs on the Development server.
          </Admonition>
        ) : null}
        {!hasLogs && !loading ? (
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
