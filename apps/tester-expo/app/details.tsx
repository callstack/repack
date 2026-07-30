import Constants from 'expo-constants';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function DetailsRoute() {
  return (
    <View style={styles.container}>
      <Text testID="expo-module-ready">
        Expo runtime: {Constants.expoVersion ?? 'development build'}
      </Text>
      <Link href="/">Back home</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    padding: 24,
  },
});
