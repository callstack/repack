import { Button, StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated';

export function ReanimatedBox() {
  const width = useSharedValue<number>(100);

  const handlePress = () => {
    width.value = withSpring(width.value + 50);
  };

  const handleReset = () => {
    width.value = withSpring(100);
  };

  return (
    <View style={styles.container}>
      <Animated.View style={{ ...styles.box, width }} />
      <View style={styles.buttons}>
        <Button onPress={handlePress} title="Click" />
        <Button onPress={handleReset} title="Reset" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
