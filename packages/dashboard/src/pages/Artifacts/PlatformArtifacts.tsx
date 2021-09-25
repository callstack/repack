import * as React from 'react';
import { DEV_SERVER_URL } from '../../constants';

interface Props {
  platform: string;
  assets: Array<{ name: string; size: string }>;
}

export function PlatformArtifacts({ platform, assets }: Props) {
  const getAssetIcon = React.useCallback((name: string) => {
    if (name.endsWith('.map')) {
      return 'source';
    }

    if (name.endsWith('.json')) {
      return 'data_object';
    }

    if (/\.(bmp|gif|jpe?g|png|psd|svg|webp|tiff)$/.test(name)) {
      return 'image';
    }

    return 'insert_drive_file';
  }, []);

  return (
    <div className="flex flex-col">
      <span className="text-gray-300 font-medium text-2xl uppercase">
        {platform}
      </span>
      <ol className="mt-1">
        {React.useMemo(
          () =>
            assets.map((asset) => (
              <li key={asset.name} className="text-lg">
                <a
                  className="w-full flex flex-row items-center bg-dark-400 rounded-sm px-2 py-1 my-1 text-gray-300 border-2 border-transparent hover:border-gray-500 cursor-pointer transition ease-in duration-100"
                  href={`${DEV_SERVER_URL}/${asset.name}?platform=${platform}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <div className="material-icons mr-2">
                    {getAssetIcon(asset.name)}
                  </div>
                  <div className="font-mono font-medium truncate">
                    {asset.name}
                  </div>
                  <div className="ml-4 text-sm text-gray-400">{asset.size}</div>
                  <div className="flex flex-grow flex-row justify-end items-center">
                    <span className="material-icons ml-6">open_in_new</span>
                  </div>
                </a>
              </li>
            )),
          [assets, getAssetIcon, platform]
        )}
      </ol>
    </div>
  );
}
