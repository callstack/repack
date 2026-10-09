import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

const MiniAppNavigator = React.lazy(() => import('MiniApp/MiniAppNavigator'));

class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text>Failed to load Mini App</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const FallbackComponent = () => (
  <View style={styles.container}>
    <ActivityIndicator color="rgba(56, 30, 114, 1)" size="large" />
  </View>
);

const MiniAppScreen = () => {
  return (
    <ErrorBoundary>
      <React.Suspense fallback={<FallbackComponent />}>
        <MiniAppNavigator />
      </React.Suspense>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MiniAppScreen;
