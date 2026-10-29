import { ScriptManager } from '@callstack/repack/client';
import * as React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import ActionButton from '../../ui/ActionButton';

const RemoteChunkId = 'remote';

const Remote = React.lazy(
  () => import(/* webpackChunkName: "remote" */ './Remote')
);

const Fallback = () => (
  <View style={styles.fallback}>
    <ActivityIndicator testID="remote-chunk-loading" />
  </View>
);

const RemoteChunkSection = () => {
  const [isPrefetched, setIsPrefetched] = React.useState(false);
  const [isLoaded, setIsLoaded] = React.useState(false);

  const prefetch = async () => {
    await ScriptManager.shared.prefetchScript(RemoteChunkId);
    setIsPrefetched(true);
  };

  const invalidate = async () => {
    await ScriptManager.shared.invalidateScripts([RemoteChunkId]);
    setIsLoaded(false);
    setIsPrefetched(false);
  };

  return (
    <View style={styles.container}>
      {isLoaded ? (
        <React.Suspense fallback={<Fallback />}>
          <Remote />
        </React.Suspense>
      ) : (
        <View style={styles.actions}>
          <ActionButton
            testID="remote-chunk-prefetch-button"
            label={isPrefetched ? 'Prefetched' : 'Prefetch chunk'}
            disabled={isPrefetched}
            onPress={prefetch}
          />
          <ActionButton
            testID="remote-chunk-load-button"
            label="Load chunk"
            onPress={() => setIsLoaded(true)}
          />
        </View>
      )}
      <ActionButton
        testID="remote-chunk-invalidate-button"
        label="Invalidate"
        variant="secondary"
        onPress={invalidate}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    paddingVertical: 12,
    gap: 8,
  },
  actions: {
    gap: 8,
  },
  fallback: {
    paddingVertical: 24,
  },
});

export default RemoteChunkSection;
