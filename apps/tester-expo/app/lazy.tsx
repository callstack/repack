import { type ErrorBoundaryProps, Link } from 'expo-router';
import { lazy, Suspense } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const LazyCard = lazy(() => import('../components/LazyCard.local'));

export function ErrorBoundary({ error }: ErrorBoundaryProps) {
  return (
    <View style={styles.container} testID="lazy-route-error">
      <Text testID="lazy-route-ready">Lazy component route failed</Text>
      <Text selectable testID="lazy-route-error-message">
        Unable to load the local async chunk: {error.message}
      </Text>
      <Link href="/">Back home</Link>
    </View>
  );
}

export default function LazyRoute() {
  return (
    <View style={styles.container}>
      <Text testID="lazy-route-ready">Lazy component route</Text>
      <Suspense fallback={<Text testID="lazy-loading">Loading chunk…</Text>}>
        <LazyCard />
      </Suspense>
      <Link href="/">Back home</Link>
    </View>
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
