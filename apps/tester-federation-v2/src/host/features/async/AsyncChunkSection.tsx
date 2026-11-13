import * as React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import ErrorBoundary from '../../ui/ErrorBoundary';

const AsyncLocal = React.lazy(
  () => import(/* webpackChunkName: "host-async-local" */ './Async.local')
);

const Fallback = () => (
  <View style={styles.fallback}>
    <ActivityIndicator testID="async-chunk-loading" />
  </View>
);

const AsyncChunkSection = () => {
  return (
    <View style={styles.container}>
      <ErrorBoundary testID="async-chunk-error-report">
        <React.Suspense fallback={<Fallback />}>
          <AsyncLocal />
        </React.Suspense>
      </ErrorBoundary>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    paddingVertical: 12,
  },
  fallback: {
    paddingVertical: 24,
  },
});

export default AsyncChunkSection;
