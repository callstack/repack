import React from 'react';
import { Text } from 'react-native';
import throttle from 'lodash.throttle';

export default function Remote() {
  throttle(() => {}, 0);
  return <Text>Remote: this text comes from remote chunk</Text>;
}
