import React from 'react';
import { Text } from 'react-native';

const Async = React.lazy(() => import('./Async.local'));

export const AsyncContainer = () => {
  return (
    <React.Suspense fallback={<Text>Loading async chunk...</Text>}>
      <Async />
    </React.Suspense>
  );
};
