import { StyleSheet, Text, View } from 'react-native';

export default function Basic() {
  return (
    <View className="bg-blue-100 p-5 rounded-full" style={styles.container}>
      <Text className="custom-style-test">Colored through CSS!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
});
