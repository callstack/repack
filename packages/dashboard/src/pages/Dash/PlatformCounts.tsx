import * as React from 'react';
import { Stats } from '../../types';

interface Props {
  stats: Stats;
}

export function PlatformCounts({ stats }: Props) {
  return (
    <div className="mt-2 flex flex-row flex-wrap justify-around bg-dark-200 py-2 rounded border-2 border-dark-100 text-gray-300">
      <div className="flex flex-col items-center mx-10 my-4">
        <span className="uppercase font-medium text-sm">Chunks</span>
        <span className="text-xl">{stats.chunks.length}</span>
      </div>
      <div className="flex flex-col items-center mx-10 my-4">
        <span className="uppercase font-medium text-sm">Assets</span>
        <span className="text-xl">
          {React.useMemo(
            () =>
              stats.chunks
                .reduce(
                  (acc, chunk) => acc.concat(...chunk.auxiliaryFiles),
                  [] as string[]
                )
                .filter(
                  (asset) =>
                    !asset.endsWith('.bundle.map') &&
                    !asset.endsWith('.bundle.json')
                ).length,
            [stats.chunks]
          )}
        </span>
      </div>
    </div>
  );
}
