import * as React from 'react';
import cx from 'classnames';
import byteSize from 'byte-size';
import { Stats } from '../../types';

interface Props {
  stats: Stats;
}

const MB_AS_BYTES = 1024 * 1024;

export function PlatformSizes({ stats }: Props) {
  const publicAssets = React.useMemo(
    () =>
      stats.assets.filter(
        (asset) =>
          asset.type === 'asset' &&
          !/\.(js)?bundle\.(map|json)$/.test(asset.name)
      ),
    [stats.assets]
  );

  const total = React.useMemo(
    () => publicAssets.reduce((acc, asset) => acc + asset.size, 0),
    [publicAssets]
  );

  const modules = React.useMemo(
    () =>
      publicAssets
        .filter((asset) => /\.((js)?bundle|js)$/.test(asset.name))
        .reduce((acc, asset) => acc + asset.size, 0),
    [publicAssets]
  );

  const getColor = React.useCallback((size: number) => {
    return cx({
      'text-green-500': size < 10 * MB_AS_BYTES,
      'text-yellow-500': size < 20 * MB_AS_BYTES,
      'text-red-500': size > 20 * MB_AS_BYTES,
    });
  }, []);

  return (
    <div className="mt-2 flex flex-row flex-wrap justify-around bg-dark-200 py-2 rounded border-2 border-dark-100 text-gray-300">
      <div className="flex flex-col items-center mx-10 my-4">
        <span className="uppercase font-medium text-sm">Total size</span>
        <span className={cx('text-xl', getColor(total))}>
          {React.useMemo(() => byteSize(total).toString(), [total])}
        </span>
      </div>
      <div className="flex flex-col items-center mx-10 my-4">
        <span className="uppercase font-medium text-sm">Modules size</span>
        <span className={cx('text-xl', getColor(modules))}>
          {React.useMemo(() => byteSize(modules).toString(), [modules])}
        </span>
      </div>
      <div className="flex flex-col items-center mx-10 my-4">
        <span className="uppercase font-medium text-sm">Assets size</span>
        <span className={cx('text-xl', getColor(total - modules))}>
          {React.useMemo(
            () => byteSize(total - modules).toString(),
            [modules, total]
          )}
        </span>
      </div>
    </div>
  );
}
