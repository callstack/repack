import React from 'react';
import throttle from 'lodash.throttle';
import { Text } from './Text';

export default function Remote() {
  throttle(() => {}, 0);
  return <Text>Remote: this text comes from remote chunk</Text>;
}
