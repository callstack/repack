import React from 'react';
import { useApi } from '../../hooks/useApi';
import { Loader } from '../../components/Loader';
import { Error } from '../../components/Error';
import { Info } from '../../components/Info';
import { Button } from '../../components/Button';

const getIconForAsset = (asset: string) => {
  if (/\.(je?pg|png|gif)$/.test(asset)) {
    return 'image';
  }

  if (asset.endsWith('.map')) {
    return 'notes';
  }

  if (asset.endsWith('.bundle')) {
    return 'code';
  }

  return 'insert_drive_file';
};

export function ArtifactListing({ platform }: { platform: string }) {
  const artifacts = useApi<{ assets: string[] }>(
    `/api/artifacts?platform=${platform}`
  );

  return (
    <div className="flex flex-col w-full mt-6">
      <h2 className="my-2 font-bold text-gray-300 text-2xl">Artifacts:</h2>
      <div className="flex flex-row justify-center pt-4 pb-8">
        {artifacts.isLoading ? (
          <Loader />
        ) : artifacts.data ? (
          artifacts.data.assets.length ? (
            <ul className="flex flex-col w-full">
              {artifacts.data.assets.map((asset) => (
                <li
                  key={asset}
                  className="my-1 text-gray-200 w-full rounded border-2 border-gray-800 flex flex-row items-center justify-between"
                >
                  <div className="flex flex-row items-center py-2 px-4">
                    <span className="material-icons text-2xl mr-2 text-blue-400">
                      {getIconForAsset(asset)}
                    </span>
                    {asset}
                  </div>
                  <Button
                    type="none"
                    className="flex flex-row items-center px-4 py-2 hover:bg-gray-800"
                    onClick={() => {
                      window.open(
                        `${document.location.origin}/${asset}?platform=${platform}`,
                        '_blank'
                      );
                    }}
                  >
                    Open
                    <span className="material-icons text-2xl ml-2 text-blue-400">
                      launch
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <Info>There are no builds artifacts available.</Info>
          )
        ) : (
          <Error>{artifacts.error?.message ?? 'Unknown error'}</Error>
        )}
      </div>
    </div>
  );
}
