import { type ErrorBoundaryProps, Link } from 'expo-router';
import { lazy, Suspense } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '../ui/Screen';

const OrdinaryWidget = lazy(() => import('OrdinaryWidget/Widget'));

export function ErrorBoundary({ error }: ErrorBoundaryProps) {
  return (
    <View style={styles.container} testID="ordinary-widget-error">
      <Text>Unable to load the ordinary Re.Pack widget.</Text>
      <Text selectable>{error.message}</Text>
      <Link href="/">Back home</Link>
    </View>
  );
}

export default function OrdinaryWidgetRoute() {
  return (
    <Screen testID="ordinary-widget-screen">
      <Suspense
        fallback={<Text testID="ordinary-widget-loading">Loading widget…</Text>}
      >
        <OrdinaryWidget />
      </Suspense>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    padding: 24,
  },
});
