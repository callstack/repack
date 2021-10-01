import * as React from 'react';
import cx from 'classnames';
import { Button } from '../../components/Button';
import { DEV_SERVER_HTTP_URL } from '../../constants';

export function CompilationTrigger() {
  const [platform, setPlatform] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);

  const trigger = React.useCallback(async () => {
    setLoading(true);
    try {
      await fetch(`${DEV_SERVER_HTTP_URL}/index.bundle?platform=${platform}`);
      setPlatform('');
    } finally {
      setLoading(false);
    }
  }, [platform]);

  return (
    <div className="flex flex-col items-start px-6 py-2">
      <h2 className="text-gray-300 font-medium text-2xl uppercase mb-2">
        TRIGGER COMPILATION
      </h2>
      <div className="bg-dark-200 p-6 rounded border-2 border-dark-100 text-gray-300 flex flex-col">
        <div className="text-gray-400 text-sm">
          Use to trigger a new compilation for provided platform without.
        </div>
        <div className="mt-3 flex flex-row">
          <input
            className={cx(
              'mr-2 bg-transparent border-2 rounded-sm border-gray-600 px-4 py-2 text-gray-200 focus:outline-none focus:border-gray-400',
              loading && 'cursor-not-allowed text-gray-500'
            )}
            placeholder="Platform name..."
            value={platform}
            onChange={React.useCallback(
              (event: React.ChangeEvent<HTMLInputElement>) => {
                setPlatform(event.target.value);
              },
              []
            )}
            disabled={loading}
          />
          <Button onClick={trigger} disabled={!platform} progress={loading}>
            Send<span className="ml-1 material-icons">input</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
