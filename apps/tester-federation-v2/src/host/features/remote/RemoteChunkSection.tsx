import { ScriptManager } from '@callstack/repack/client';
import * as React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const RemoteChunkId = 'remote';

const Remote = React.lazy(
  () => import(/* webpackChunkName: "remote" */ './Remote')
);

const Fallback = () => (
  <View style={styles.fallback}>
    <ActivityIndicator testID="remote-chunk-loading" />
  </View>
);

type Props = {
  onPrefetched: () => void;
  onInvalidated: () => void;
};

const RemoteChunkSection = ({ onPrefetched, onInvalidated }: Props) => {
  const [isPrefetched, setIsPrefetched] = React.useState(false);
  const [isLoaded, setIsLoaded] = React.useState(false);

  const prefetch = async () => {
    await ScriptManager.shared.prefetchScript(RemoteChunkId);
    setIsPrefetched(true);
    onPrefetched();
  };

  const invalidate = async () => {
    await ScriptManager.shared.invalidateScripts([RemoteChunkId]);
    setIsLoaded(false);
    setIsPrefetched(false);
    onInvalidated();
  };

  return (
    <View style={styles.container}>
      {isLoaded ? (
        <React.Suspense fallback={<Fallback />}>
          <Remote />
        </React.Suspense>
      ) : (
        <View style={styles.actions}>
          <TouchableOpacity
            testID="remote-chunk-prefetch-button"
            style={[styles.button, isPrefetched && styles.buttonDisabled]}
            disabled={isPrefetched}
            onPress={prefetch}
          >
            <Text style={styles.buttonText}>
              {isPrefetched ? 'Prefetched' : 'Prefetch chunk'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="remote-chunk-load-button"
            style={styles.button}
            onPress={() => setIsLoaded(true)}
          >
            <Text style={styles.buttonText}>Load chunk</Text>
          </TouchableOpacity>
        </View>
      )}
      <TouchableOpacity
        testID="remote-chunk-invalidate-button"
        style={[styles.button, styles.secondaryButton]}
        onPress={invalidate}
      >
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>
          Invalidate
        </Text>
      </TouchableOpacity>
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
  button: {
    alignSelf: 'stretch',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 30, 114, 1)',
  },
  secondaryButton: {
    backgroundColor: '#d8cbe8',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
  },
  secondaryButtonText: {
    color: '#200a12',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default RemoteChunkSection;
