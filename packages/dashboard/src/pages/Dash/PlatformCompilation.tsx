import * as React from 'react';
import cx from 'classnames';
import { useDevServer } from '../../hooks/useDevServer';

interface Props {
  platform: string;
}

export function PlatformCompilation({ platform }: Props) {
  const [progress, setProgress] = React.useState<string>('—');
  const [message, setMessage] = React.useState<string>('—');
  const [status, setStatus] = React.useState<string>('Idle');
  const { getProxyConnection } = useDevServer();

  React.useEffect(() => {
    const subscription = getProxyConnection().subscribe({
      next: (event) => {
        if (
          event.type === 'message' &&
          event.payload.kind === 'progress' &&
          event.payload.platform === platform
        ) {
          let { value, label, message } = event.payload;
          if (!label || value >= 1) {
            label = 'idle';
          }

          setStatus(`${label[0].toUpperCase()}${label.slice(1)}`);
          setMessage(message || '—');
          setProgress(value && value < 1 ? `${Math.floor(value * 100)}%` : '—');
        }
      },
      complete: () => {
        setStatus('—');
      },
      error: () => {
        setStatus('—');
      },
    });

    return () => subscription.unsubscribe();
  }, [getProxyConnection, platform]);

  return (
    <div className="flex flex-col bg-dark-200 py-2 rounded border-2 border-dark-100 text-gray-300">
      <div className="flex flex-row justify-around">
        <div className="flex flex-col items-center mx-10 my-4">
          <span className="uppercase font-medium text-sm">Status</span>
          <span
            className={cx('text-xl', {
              'text-green-500': !/^(Idle|N\/A)/.test(status),
              'text-yellow-500': status.startsWith('Idle'),
              'text-red-500': status === '—',
            })}
          >
            {status}
          </span>
        </div>
        <div className="flex flex-col items-center mx-10 my-4">
          <span className="uppercase font-medium text-sm">Progress</span>
          <span className="text-xl">{progress}</span>
        </div>
      </div>
      <div className="flex flex-row justify-center">
        <div className="flex flex-col items-center mx-10 my-4">
          <span className="uppercase font-medium text-sm">Message</span>
          <span className="text-sm text-gray-400">{message}</span>
        </div>
      </div>
    </div>
  );
}
