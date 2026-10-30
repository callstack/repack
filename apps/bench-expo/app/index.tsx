import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

export default function HomeRoute() {
  const [count, setCount] = useState(0);

  return (
    <View style={styles.container}>
      <Text testID="router-ready">Expo Router benchmark app</Text>
      <Text testID="refresh-state">Parent state: {count}</Text>
      <Button
        testID="refresh-increment"
        title="Increment"
        onPress={() => setCount((value) => value + 1)}
      />
      <Link href="/details">Open details</Link>
      <Link href="/image">Open packaged image fixture</Link>
      <Link href="/density-image">Open density image fixture</Link>
      <Link href="/lazy">Open lazy component fixture</Link>
      <StatusBar style="auto" />
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
