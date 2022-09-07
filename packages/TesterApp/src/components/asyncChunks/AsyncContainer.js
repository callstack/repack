import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from '../ui/Text';

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
