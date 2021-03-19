import React, { useEffect, useState } from 'react';
import { Text, View, NativeModules } from 'react-native';

const Async = React.lazy(
  () => import('./Async')
);

export function Hello() {
  const [value, setValue] = useState('not updated');

  useEffect(() => {
    setTimeout(() => {
      setValue('updated');
    }, 1000);
  });

  return (
    <View>
      <Text>Hello world: {value}</Text>
      <React.Suspense fallback={<Text>Loading...</Text>}>
        <Async />
      </React.Suspense>
    </View>
  );
}
