import { ScrollView, StyleSheet, View } from 'react-native';
import RemoteChunkSection from '../features/remote/RemoteChunkSection';

const RemoteChunkScreen = () => {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <View testID="remote-chunk-screen" style={styles.container}>
        <RemoteChunkSection />
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

export default RemoteChunkScreen;
