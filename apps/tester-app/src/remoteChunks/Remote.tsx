import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '../ui/Text';

export default function Remote() {
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
