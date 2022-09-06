import React from 'react';
import throttle from 'lodash.throttle';
import { StyleSheet, View } from 'react-native';
import { Text } from './Text';

export default function Remote() {
  throttle(() => {}, 0);
  return (
    <View style={styles.container}>
      <Text>Remote: this text comes from remote chunk</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
