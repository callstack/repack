import React, { useState } from 'react';
import { Button, Text } from 'react-native';
import { ChunkManager } from '../../client';

const Remote = React.lazy(() =>
  import(/* webpackChunkName: "remote" */ './Remote')
);

const RemoteChunksSection = () => {
  const [isPreloaded, setIsPreloaded] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <>
      {isLoaded ? (
        <React.Suspense fallback={<Text>Loading...</Text>}>
          <Remote />
        </React.Suspense>
      ) : (
        <>
          <Button
            title={isPreloaded ? 'Preloaded' : 'Preload chunk'}
            disabled={isPreloaded}
            onPress={async () => {
              await ChunkManager.preloadChunk('remote');
              setIsPreloaded(true);
            }}
          />

          <Button title="Load chunk" onPress={() => setIsLoaded(true)} />
        </>
      )}
      <Button
        title={'Invalidate'}
        onPress={async () => {
          await ChunkManager.invalidateChunks(['remote']);
          setIsPreloaded(false);
        }}
      />
      <Button
        title={'Invalidate all'}
        onPress={async () => {
          await ChunkManager.invalidateChunks([]);
          setIsPreloaded(false);
        }}
      />
    </>
  );
};

export default RemoteChunksSection;
