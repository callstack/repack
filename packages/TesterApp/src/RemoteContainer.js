import React, { useState } from 'react';
import { Button, View } from 'react-native';
import { ScriptManager } from '@callstack/repack/client';
import { Text } from './Text';

const RemoteChunkId = 'remote';
const Remote = React.lazy(() =>
  import(/* webpackChunkName: "remote" */ './Remote')
);

export const RemoteContainer = () => {
  const [isPrefetched, setIsPrefetched] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <View>
      {isLoaded ? (
        <React.Suspense fallback={<Text>Loading...</Text>}>
          <Remote />
        </React.Suspense>
      ) : (
        <>
          <Button
            title={isPrefetched ? 'Prefetched' : 'Prefetch chunk'}
            disabled={isPrefetched}
            onPress={async () => {
              await ScriptManager.prefetchScript(RemoteChunkId);
              setIsPrefetched(true);
            }}
          />

          <Button title="Load chunk" onPress={() => setIsLoaded(true)} />
        </>
      )}
      <Button
        title={'Invalidate'}
        onPress={async () => {
          await ScriptManager.invalidateScripts([RemoteChunkId]);
          setIsPreloaded(false);
        }}
      />
    </View>
  );
};
