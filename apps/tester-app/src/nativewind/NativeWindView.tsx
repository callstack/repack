import { StyleSheet, Text, View } from 'react-native';

import './global.css';

export function NativeWindView() {
  return (
    <View style={styles.container}>
      <View className="bg-red-500">
        <Text className="text-white">Hello, World!</Text>
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
});
