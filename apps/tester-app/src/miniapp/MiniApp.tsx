import { Image, StyleSheet, View } from 'react-native';

import { Text } from '../ui/Text';

import img from './callstack-dark.png';

export default function MiniApp() {
  return (
    <View style={styles.container}>
      <Text>MiniApp: this text comes from MiniApp</Text>
      <Image
        accessibilityIgnoresInvertColors
        source={img}
        style={styles.image}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    marginTop: 12,
  },
});
