import * as React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

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
      <React.Suspense fallback={<Fallback />}>
        <AsyncLocal />
      </React.Suspense>
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
