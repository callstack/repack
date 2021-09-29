import * as React from 'react';
import cx from 'classnames';
import { useDevServer } from '../hooks/useDevServer';

export function ConnectionStatus() {
  const [status, setStatus] = React.useState<
    'connected' | 'connecting' | 'disconnected'
  >('connecting');
  const [showRetry, setShowRetry] = React.useState(false);
  const { getProxyConnection, tryReconnecting } = useDevServer();

  const retry = React.useCallback(() => {
    setShowRetry(false);
    tryReconnecting();
  }, [tryReconnecting]);

  React.useEffect(() => {
    const subscription = getProxyConnection().subscribe({
      next: (event) => {
        if (event.type === 'init') {
          setStatus('connecting');
        } else if (event.type === 'open' || event.type === 'message') {
          setStatus('connected');
        } else if (event.type === 'close') {
          if (event.retriesLeft === 0) {
            setStatus('disconnected');
            setShowRetry(true);
          }
        }
      },
      complete: () => {
        setStatus('disconnected');
      },
      error: () => {
        setStatus('disconnected');
      },
    });

    return () => subscription.unsubscribe();
  }, [getProxyConnection]);

  return (
    <div className="px-8">
      <span className="text-gray-400 text-xs">Development server:</span>
      <div className="flex flex-row items-center">
        <div
          className={cx('w-2 h-2 rounded-sm', {
            'bg-green-500': status === 'connected',
            'bg-yellow-500': status === 'connecting',
            'bg-red-500': status === 'disconnected',
          })}
        />
        <span className="ml-2 text-gray-300">
          {status[0].toUpperCase()}
          {status.slice(1)}
        </span>
        {showRetry ? (
          <button
            className="ml-4 material-icons text-gray-400 hover:text-gray-200 transition ease-in duration-100"
            onClick={retry}
          >
            refresh
          </button>
        ) : null}
      </div>
    </div>
  );
}
