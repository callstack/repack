import type { ErrorBoundaryProps } from 'expo-router';
import { lazy, Suspense } from 'react';
import { Text } from 'react-native';
import Report from '../ui/Report';
import Screen from '../ui/Screen';

const LazyCard = lazy(() => import('../components/LazyCard.local'));

export function ErrorBoundary({ error }: ErrorBoundaryProps) {
  return (
    <Screen testID="lazy-screen">
      <Report testID="lazy-error-report" name="error" value={error.message} />
    </Screen>
  );
}

export default function LazyRoute() {
  return (
    <Screen testID="lazy-screen">
      <Suspense fallback={<Text testID="lazy-loading">Loading chunk…</Text>}>
        <LazyCard />
      </Suspense>
    </Screen>
  );
}
