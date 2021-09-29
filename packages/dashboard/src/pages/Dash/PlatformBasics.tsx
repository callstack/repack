import * as React from 'react';
import cx from 'classnames';
import { Stats } from '../../types';

interface Props {
  stats: Stats;
}

export function PlatformBasics({ stats }: Props) {
  return (
    <div className="mt-2 flex flex-row flex-wrap justify-around bg-dark-200 py-2 rounded border-2 border-dark-100 text-gray-300">
      <div className="flex flex-col items-center mx-10 my-4">
        <span className="uppercase font-medium text-sm">Built in</span>
        <span className="text-xl">{Math.ceil(stats.time / 1000)}s</span>
      </div>
      <div className="flex flex-col items-center mx-10 my-4">
        <span className="uppercase font-medium text-sm">Warnings</span>
        <span
          className={cx(
            'text-xl',
            stats.warnings.length ? 'text-yellow-500' : 'text-green-500'
          )}
        >
          {stats.warnings.length}
        </span>
      </div>
      <div className="flex flex-col items-center mx-10 my-4">
        <span className="uppercase font-medium text-sm">Errors</span>
        <span
          className={cx(
            'text-xl',
            stats.errors.length ? 'text-red-500' : 'text-green-500'
          )}
        >
          {stats.errors.length}
        </span>
      </div>
    </div>
  );
}
