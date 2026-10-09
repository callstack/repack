import { useFonts } from 'expo-font';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function FontRoute() {
  const [fontsLoaded, fontError] = useFonts({
    ExpoFixture: require('../assets/fonts/material-symbols-regular.ttf'),
  });

  if (fontError) {
    return (
      <View style={styles.container}>
        <Text testID="font-error">Font error: {fontError.message}</Text>
      </View>
    );
  }

  if (!fontsLoaded) {
    return (
      <View style={styles.container}>
        <Text testID="font-loading">Loading bundled font…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text>Bundled font loaded by expo-font:</Text>
      <Text style={styles.fixtureFont} testID="font-ready">
        home
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
  fixtureFont: {
    fontFamily: 'ExpoFixture',
    fontSize: 32,
  },
});
