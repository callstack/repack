import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import ErrorBoundary from '../ui/ErrorBoundary';

const MiniAppNavigator = React.lazy(() => import('MiniApp/MiniAppNavigator'));

const FallbackComponent = () => (
  <View style={styles.container}>
    <ActivityIndicator color="rgba(56, 30, 114, 1)" size="large" />
  </View>
);

const MiniAppScreen = () => {
  return (
    <View style={styles.screen}>
      <ErrorBoundary testID="miniapp-error-report">
        <React.Suspense fallback={<FallbackComponent />}>
          <MiniAppNavigator />
        </React.Suspense>
      </ErrorBoundary>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MiniAppScreen;
