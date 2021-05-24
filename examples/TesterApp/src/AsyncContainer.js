import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

const Async = React.lazy(() => import('./Async'));

export function AsyncContainer() {
  const [value, setValue] = useState('not updated');

  useEffect(() => {
    setTimeout(() => {
      setValue('updated');
    }, 1000);
  });

  return (
    <View>
      <Text>Async container status: {value}</Text>
      <React.Suspense fallback={<Text>Loading...</Text>}>
        <Async />
      </React.Suspense>
    </View>
  );
}
