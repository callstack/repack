import { lazy, type ReactNode, Suspense, useState } from 'react';
import {
  Button,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { screens } from './generated';

// Same features as apps/bench-expo, without Expo or a navigation library: a
// details view, a packaged image, a lazily loaded component, and the
// generated screens.
const LazyCard = lazy(() => import('./LazyCard'));

type Route =
  | { name: 'home' | 'details' | 'image' | 'lazy' }
  | { name: 'screen'; index: number };

function Details({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.container}>
      <Text>React Native benchmark app</Text>
      <Button title="Back home" onPress={onBack} />
    </View>
  );
}

function ImageScreen({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.container}>
      <Image
        accessibilityLabel="Re.Pack logo"
        source={require('../assets/repack.png')}
        style={styles.image}
      />
      <Button title="Back home" onPress={onBack} />
    </View>
  );
}

function LazyScreen({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.container}>
      <Suspense fallback={<Text>Loading…</Text>}>
        <LazyCard />
      </Suspense>
      <Button title="Back home" onPress={onBack} />
    </View>
  );
}

export default function App() {
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [count, setCount] = useState(0);
  const home = () => setRoute({ name: 'home' });

  let content: ReactNode;
  if (route.name === 'details') {
    content = <Details onBack={home} />;
  } else if (route.name === 'image') {
    content = <ImageScreen onBack={home} />;
  } else if (route.name === 'lazy') {
    content = <LazyScreen onBack={home} />;
  } else if (route.name === 'screen') {
    const Screen = screens[route.index];
    content = <Screen onBack={home} />;
  } else {
    content = (
      <View style={styles.container}>
        <Text>Count: {count}</Text>
        <Button title="Increment" onPress={() => setCount((c) => c + 1)} />
        <Button
          title="Open details"
          onPress={() => setRoute({ name: 'details' })}
        />
        <Button
          title="Open image"
          onPress={() => setRoute({ name: 'image' })}
        />
        <Button
          title="Open lazy component"
          onPress={() => setRoute({ name: 'lazy' })}
        />
        <FlatList
          data={screens.map((_, index) => index)}
          keyExtractor={(index) => String(index)}
          renderItem={({ item: index }) => (
            <Pressable onPress={() => setRoute({ name: 'screen', index })}>
              <Text>Screen {index}</Text>
            </Pressable>
          )}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" />
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: {
    alignItems: 'center',
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    padding: 24,
  },
  image: { height: 120, width: 120 },
});
