import React, { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { Loader } from '../../components/Loader';
import { Error } from '../../components/Error';
import { Info } from '../../components/Info';
import { Button } from '../../components/Button';
import { ArtifactListing } from './ArtifactListing';

export function Artifacts() {
  const platforms = useApi<{ platforms: string[] }>('/api/platforms');
  const [selectedPlatform, setSelectedPlatform] = useState('');

  return (
    <div className="flex flex-col w-full">
      <h2 className="my-2 font-bold text-gray-300 text-2xl">
        Select platform:
      </h2>
      <div className="flex flex-row pt-4 pb-8 border-b-2 border-gray-800">
        {platforms.isLoading ? (
          <Loader />
        ) : platforms.data ? (
          platforms.data.platforms.length ? (
            <>
              {platforms.data.platforms.map((platform) => (
                <Button
                  key={platform}
                  type="primary"
                  className="!ml-0"
                  active={selectedPlatform === platform}
                  onClick={() => {
                    setSelectedPlatform(platform);
                  }}
                >
                  {platform}
                </Button>
              ))}
            </>
          ) : (
            <Info>There are no builds available.</Info>
          )
        ) : (
          <Error>{platforms.error?.message ?? 'Unknown error'}</Error>
        )}
      </div>
      {selectedPlatform ? (
        <ArtifactListing platform={selectedPlatform} />
      ) : null}
    </div>
  );
}
