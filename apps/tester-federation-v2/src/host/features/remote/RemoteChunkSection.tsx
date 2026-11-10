import { ScriptManager } from '@callstack/repack/client';
import * as React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import ActionButton from '../../ui/ActionButton';

const RemoteChunkId = 'remote';

const Remote = React.lazy(
  () => import(/* webpackChunkName: "remote" */ './Remote')
);

let loadedThisSession = false;

const Fallback = () => (
  <View style={styles.fallback}>
    <ActivityIndicator testID="remote-chunk-loading" />
  </View>
);

const RemoteChunkSection = () => {
  const [isPrefetched, setIsPrefetched] = React.useState(false);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [inMemory, setInMemory] = React.useState(loadedThisSession);

  const prefetch = async () => {
    await ScriptManager.shared.prefetchScript(RemoteChunkId);
    setIsPrefetched(true);
  };

  const load = () => {
    loadedThisSession = true;
    setInMemory(true);
    setIsLoaded(true);
  };

  const clearCache = async () => {
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
            label={inMemory ? 'Load from memory' : 'Load chunk'}
            onPress={load}
          />
        </View>
      )}
      <ActionButton
        testID="remote-chunk-clear-cache-button"
        label="Clear cache"
        variant="secondary"
        onPress={clearCache}
      />
      <Text style={styles.note}>
        Code stays in memory until the app restarts. Clear cache only affects
        the next start. Prefetch after Clear cache downloads again, for the next
        start.
      </Text>
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
  note: {
    fontSize: 13,
    color: '#6b5a60',
  },
});

export default RemoteChunkSection;
