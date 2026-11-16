import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import ReanimatedBox from '../features/reanimated/ReanimatedBox';
import Report from '../ui/Report';

const ReanimatedScreen = () => {
  const [width, setWidth] = React.useState(100);

  return (
    <ScrollView
      testID="reanimated-screen"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <View style={styles.container}>
        <ReanimatedBox onWidthChange={setWidth} />
        <Report testID="reanimated-width-report" name="width" value={width} />
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

export default ReanimatedScreen;
