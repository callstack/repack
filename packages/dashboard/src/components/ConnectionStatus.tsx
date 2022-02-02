import * as React from 'react';
import cx from 'classnames';
import { useActor } from '@xstate/react';
import { useRootService } from '../context/RootMachineContext';

export function ConnectionStatus() {
  const [rootState] = useRootService();
  const [proxyConnectionState, send] = useActor(
    rootState.context.proxyConnectionRef!
  );
  const status = proxyConnectionState.context.uiState;
  const retry = React.useCallback(() => {
    send({ type: 'RESET' });
  }, [send]);

  return (
    <div className="px-8">
      <span className="text-gray-400 text-xs">Development server:</span>
      <div className="flex flex-row items-center">
        <div
          className={cx('w-2 h-2 rounded-sm', {
            'bg-green-500': status === 'Connected',
            'bg-yellow-500': status === 'Connecting',
            'bg-red-500': status === 'Disconnected',
          })}
        />
        <span className="ml-2 text-gray-300">{status}</span>
        {status === 'Disconnected' ? (
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
