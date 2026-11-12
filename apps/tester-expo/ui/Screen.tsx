import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

type ScreenProps = {
  testID: string;
  children: ReactNode;
};

const Screen = ({ testID, children }: ScreenProps) => (
  <ScrollView
    contentInsetAdjustmentBehavior="automatic"
    contentContainerStyle={styles.content}
  >
    <View testID={testID} style={styles.container}>
      {children}
    </View>
  </ScrollView>
);

const styles = StyleSheet.create({
  content: {
    paddingVertical: 16,
  },
  container: {
    paddingHorizontal: 16,
    gap: 4,
  },
});

export default Screen;
