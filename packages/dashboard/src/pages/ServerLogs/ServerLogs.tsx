import * as React from 'react';
import { Console } from 'console-feed';
import { Message } from 'console-feed/lib/definitions/Component';
import parse from 'console-feed/lib/Hook/parse';
import { Encode as encode } from 'console-feed/lib/Transform';
import { useActor } from '@xstate/react';
import { PageLayout } from '../../components/PageLayout';
import { Admonition } from '../../components/Admonition';
import { LogEntry } from '../../types';
import { useRootService } from '../../context/RootMachineContext';
import { LogsFeed } from '../../components/LogsFeed';
import { ActionsBar } from './ActionsBar';
import './ServerLogs.scss';

const BOTTOM_ACTION_BAR_THRESHOLD = 15;

export function ServerLogs() {
  const [rootState] = useRootService();
  const [state, send] = useActor(rootState.context.serverLogsRef!);
  const shouldScrollToBottom = React.useRef(true);

  const clearLogs = React.useCallback(() => {
    send({ type: 'CLEAR_LOGS' });
  }, [send]);

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

    const parsed = parse(log.type, [
      `[${new Date(log.timestamp).toISOString().split('T')[1]}] ${log.issuer}:`,
      ...args,
    ]);

    const [encoded] = encode(parsed) as [Message];
    return encoded;
  }, []);

  const logs = React.useMemo(
    () => state.context.logs.map((log) => processLog(log)),
    [processLog, state.context.logs]
  );
  const logsLimit = state.context.logsLimit;
  const hasLogs = logs.length > 0;
  const loading = state.matches('loading');

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

  return (
    <PageLayout title="Server logs">
      <LogsFeed />
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
        {hasLogs ? (
          <ActionsBar
            label={`Showing last ${Math.min(logs.length, logsLimit)} logs.`}
            position="top"
            onClear={clearLogs}
            onScroll={scrollToBottom}
          />
        ) : null}
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
            label={`Showing last ${Math.min(logs.length, logsLimit)} logs.`}
            position="bottom"
            onClear={clearLogs}
            onScroll={scrollToTop}
          />
        ) : null}
      </div>
    </PageLayout>
  );
}
