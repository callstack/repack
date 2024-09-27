import React from 'react';
import {
  Button as RNButton,
  type ButtonProps as RNButtonProps,
  View,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type ButtonProps = RNButtonProps & {
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, disabled, onPress, style }: ButtonProps) {
  return (
    <View style={[styles.container, style]}>
      <RNButton title={title} disabled={disabled} onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
});
