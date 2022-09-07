import React from 'react';
import { Button as RNButton, View, StyleSheet } from 'react-native';

export function Button({ title, disabled, onPress, style }) {
  return (
    <View style={[styles.container, style]}>
      <RNButton
        title={title}
        disabled={disabled}
        onPress={onPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
});
