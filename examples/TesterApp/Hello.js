import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

export function Hello() {
  const [value, setValue] = useState('not updated');

  useEffect(() => {
    setTimeout(() => {
      setValue('updated');
    }, 1000);
  });

  return (
    <View>
      <Text>Hello: {value}</Text>
    </View>
  );
}
