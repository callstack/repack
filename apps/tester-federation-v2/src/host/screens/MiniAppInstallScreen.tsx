import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import MiniAppSection from '../features/miniapp/MiniAppSection';
import Report from '../ui/Report';

const MiniAppInstallScreen = () => {
  const [invalidated, setInvalidated] = React.useState(false);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <View testID="miniapp-install-screen" style={styles.container}>
        <MiniAppSection onInvalidated={() => setInvalidated(true)} />
        <Report
          testID="miniapp-install-invalidated-report"
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

export default MiniAppInstallScreen;
