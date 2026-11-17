import { StyleSheet, Text, View } from 'react-native';

export default function LazyCard() {
  return (
    <View style={styles.card}>
      <Text>This component is loaded lazily.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#e9f7ef',
    borderColor: '#1f7a4d',
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
});
