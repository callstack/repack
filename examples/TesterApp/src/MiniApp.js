import React from 'react';
import { View, Image } from 'react-native';
import { Text } from './Text';
import img from './callstack-dark.png';

export default function MiniApp() {
  return (
    <View>
      <Text>MiniApp: this text comes from MiniApp</Text>
      <Image accessibilityIgnoresInvertColors source={img} />
    </View>
  );
}
