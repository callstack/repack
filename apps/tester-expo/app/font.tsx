import { useFonts } from 'expo-font';
import { StyleSheet, Text } from 'react-native';
import Report from '../ui/Report';
import Screen from '../ui/Screen';

export default function FontRoute() {
  const [fontsLoaded, fontError] = useFonts({
    ExpoFixture: require('../assets/fonts/material-symbols-regular.ttf'),
  });

  const state = fontError
    ? `error: ${fontError.message}`
    : fontsLoaded
      ? 'loaded'
      : 'loading';

  return (
    <Screen testID="font-screen">
      <Report testID="font-load-report" name="font" value={state} />
      {fontsLoaded ? (
        <Text style={styles.fixtureFont} testID="font-ready">
          home
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fixtureFont: {
    fontFamily: 'ExpoFixture',
    fontSize: 32,
    paddingHorizontal: 12,
  },
});
