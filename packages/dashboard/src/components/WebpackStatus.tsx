import * as React from 'react';
import cx from 'classnames';
import { useDevServer } from '../hooks/useDevServer';

interface Props {
  className?: string;
}

export function WebpackStatus({ className }: Props) {
  const { getPlatforms } = useDevServer();

  const [status, setStatus] = React.useState<Record<string, string>>({});
  const { getProxyConnection } = useDevServer();

  React.useEffect(() => {
    const subscription = getProxyConnection().subscribe({
      next: (event) => {
        if (event.type === 'message' && event.payload.kind === 'progress') {
          let { value, label, platform } = event.payload;
          if (!label || value >= 1) {
            label = 'idle';
          }
          setStatus((status) => ({
            ...status,
            [platform]: `${label[0].toUpperCase()}${label.slice(1)} ${
              value < 1 ? `${Math.floor(value * 100)}%` : ''
            }`,
          }));
        }
      },
      complete: () => {
        setStatus({});
      },
      error: () => {
        setStatus({});
      },
    });

    return () => subscription.unsubscribe();
  }, [getProxyConnection]);

  return (
    <div className={cx('px-8', className)}>
      <span className="text-gray-400 text-xs">Webpack:</span>
      {!getPlatforms().length ? (
        <PlatformStatus platform="" status="N/A" />
      ) : null}
      {React.useMemo(
        () =>
          getPlatforms()
            .map((platform) => [platform, status[platform]])
            .map(([platform, platformStatus = 'Idle']) => (
              <PlatformStatus
                key={platform}
                platform={platform}
                status={platformStatus}
              />
            )),
        [getPlatforms, status]
      )}
    </div>
  );
}

function PlatformStatus({
  platform,
  status,
}: {
  platform?: string;
  status: string;
}) {
  return (
    <div className="flex flex-row items-center">
      <div
        className={cx('w-2 h-2 rounded-sm ', {
          'bg-green-500': !/^(Idle|N\/A)/.test(status),
          'bg-yellow-500': status.startsWith('Idle'),
          'bg-red-500': status.startsWith('N/A'),
        })}
      />
      <span className="ml-2 text-gray-300">
        {status}
        {platform ? ` — ${platform.toUpperCase()}` : null}
      </span>
    </div>
  );
}
