import { ScrollView, StyleSheet, View } from 'react-native';
import MiniAppSection from '../features/miniapp/MiniAppSection';

const MiniAppInstallScreen = () => {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <View testID="miniapp-install-screen" style={styles.container}>
        <MiniAppSection />
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
