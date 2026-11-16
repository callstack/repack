import { StyleSheet, Text, View } from 'react-native';

export default function AsyncLocal() {
  return (
    <View style={styles.container}>
      <Text testID="async-chunk-content" style={styles.text}>
        Async: this text comes from async chunk
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    color: '#200a12',
  },
});
