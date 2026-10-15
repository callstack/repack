import { Alert, Button, StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated';
import {
  createWorkletRuntime,
  scheduleOnRN,
  scheduleOnRuntime,
  scheduleOnUI,
} from 'react-native-worklets';

export function ReanimatedBox() {
  const width = useSharedValue<number>(100);

  const onTestBundleMode = () => {
    const runtime = createWorkletRuntime('test');
    const showAlert = (title: string, message: string) =>
      Alert.alert(title, message);

    scheduleOnRuntime(runtime, () => {
      'worklet';

      try {
        // This is allowed only in Bundle Mode
        scheduleOnUI(() => {
          'worklet';

          scheduleOnRN(showAlert, 'Success', 'Bundle Mode works!');
        });
      } catch (error) {
        scheduleOnRN(showAlert, 'Error', `${String(error)}`);
      }
    });
  };

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
      <View style={styles.buttons}>
        <Button onPress={onTestBundleMode} title="Test Bundle Mode" />
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
    marginTop: 10,
  },
});
