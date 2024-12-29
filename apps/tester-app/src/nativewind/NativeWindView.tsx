import { StyleSheet, Text, View } from 'react-native';
export function NativeWindView() {
  return (
    <View style={styles.container}>
      <View className="bg-yellow-400">
        <Text className="inline">Hello, World! lol iksde</Text>
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
