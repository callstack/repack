import { StyleSheet, Text, View } from 'react-native';

const lazyChunkSentinel = 'repack-expo-widget-lazy-sentinel';

export default function WidgetLazyDetails({
  onReady,
}: {
  onReady: () => void;
}) {
  return (
    <View
      accessibilityHint={lazyChunkSentinel}
      onLayout={onReady}
      style={styles.card}
      testID="expo-widget-lazy-ready"
    >
      <Text>This content was loaded from a nested remote widget chunk.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#eff6ff',
    borderColor: '#1d4ed8',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
});
