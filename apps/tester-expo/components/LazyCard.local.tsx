import { StyleSheet, Text, View } from 'react-native';

const lazyChunkSentinel = 'repack-expo-local-lazy-card-sentinel';

export default function LazyCard() {
  return (
    <View
      accessibilityHint={lazyChunkSentinel}
      style={styles.card}
      testID="lazy-component-ready"
    >
      <Text>This component was loaded from an async Re.Pack chunk.</Text>
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
