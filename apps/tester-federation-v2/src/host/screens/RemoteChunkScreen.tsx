import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import RemoteChunkSection from '../features/remote/RemoteChunkSection';
import Report from '../ui/Report';

const RemoteChunkScreen = () => {
  const [prefetched, setPrefetched] = React.useState(false);
  const [invalidated, setInvalidated] = React.useState(false);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <View testID="remote-chunk-screen" style={styles.container}>
        <RemoteChunkSection
          onPrefetched={() => setPrefetched(true)}
          onInvalidated={() => {
            setInvalidated(true);
            setPrefetched(false);
          }}
        />
        <Report
          testID="remote-chunk-prefetched-report"
          name="prefetched"
          value={prefetched}
        />
        <Report
          testID="remote-chunk-invalidated-report"
          name="invalidated"
          value={invalidated}
        />
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
