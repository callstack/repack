import { ScrollView, StyleSheet, View } from 'react-native';

import AsyncChunkSection from '../features/async/AsyncChunkSection';

const AsyncChunkScreen = () => {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <View testID="async-chunk-screen" style={styles.container}>
        <AsyncChunkSection />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingVertical: 16,
  },
  container: {
    paddingHorizontal: 16,
    gap: 4,
  },
});

export default AsyncChunkScreen;
