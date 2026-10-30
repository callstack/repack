import * as React from 'react';
import { Button, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const BASE_WIDTH = 100;

export default function ReanimatedBox({
  onWidthChange,
}: {
  onWidthChange: (width: number) => void;
}) {
  const width = useSharedValue<number>(BASE_WIDTH);
  const target = React.useRef(BASE_WIDTH);

  const boxStyle = useAnimatedStyle(() => {
    'worklet';
    return { width: width.value };
  });

  useAnimatedReaction(
    () => width.value,
    (_previous, next) => {
      'worklet';
      if (next !== null) {
        scheduleOnRN(onWidthChange, Math.round(next));
      }
    }
  );

  const handlePress = () => {
    target.current += 50;
    width.value = withSpring(target.current);
  };

  const handleReset = () => {
    target.current = BASE_WIDTH;
    width.value = withSpring(target.current);
  };

  return (
    <View style={styles.container}>
      <Animated.View testID="reanimated-box" style={[styles.box, boxStyle]} />
      <View style={styles.buttons}>
        <Button
          testID="reanimated-click-button"
          onPress={handlePress}
          title="Click"
        />
        <Button
          testID="reanimated-reset-button"
          onPress={handleReset}
          title="Reset"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 16,
  },
  box: {
    height: 100,
    backgroundColor: '#b58df1',
    borderRadius: 20,
    marginVertical: 0,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});
