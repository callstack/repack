import { StyleSheet, Text, View } from 'react-native';

export default function Remote() {
  return (
    <View style={styles.container}>
      <Text testID="remote-chunk-content" style={styles.text}>
        Remote: this text comes from remote chunk
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
