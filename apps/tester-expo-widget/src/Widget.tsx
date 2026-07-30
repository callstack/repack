import { Asset } from 'expo-asset';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import {
  type ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Image, PixelRatio, StyleSheet, Text, View } from 'react-native';

const widgetDensityImage = require('../assets/images/widget-density.png');
const widgetDensityAsset = Asset.fromModule(widgetDensityImage);
const widgetFontAsset = Asset.fromModule(
  require('../assets/fonts/material-symbols-regular.ttf')
);
const widgetRuntimeGeneration = Date.now();

type LazyDetailsComponent = ComponentType<{ onReady: () => void }>;

type LazyDetailsLoadState =
  | { status: 'loading' }
  | { component: LazyDetailsComponent; status: 'loaded' }
  | { error: Error; status: 'failed' };

function LazyDetailsLoader({
  onReady,
}: {
  onReady: () => void;
}) {
  const [loadState, setLoadState] = useState<LazyDetailsLoadState>({
    status: 'loading',
  });

  useEffect(() => {
    let active = true;
    import(
      /* webpackChunkName: "expo-widget-lazy" */ './WidgetLazyDetails'
    ).then(
      ({ default: component }) => {
        if (active) setLoadState({ component, status: 'loaded' });
      },
      (error: Error) => {
        if (active) setLoadState({ error, status: 'failed' });
      }
    );
    return () => {
      active = false;
    };
  }, []);

  if (loadState.status === 'failed') throw loadState.error;
  if (loadState.status === 'loading') {
    return (
      <Text testID="expo-widget-lazy-loading">
        Loading nested widget chunk…
      </Text>
    );
  }

  const LazyDetails = loadState.component;
  return <LazyDetails onReady={onReady} />;
}

export default function Widget({
  recoveryAttempt = 0,
}: {
  recoveryAttempt?: number;
}) {
  const resolvedImage = useMemo(
    () => Image.resolveAssetSource(widgetDensityImage),
    []
  );
  const imageSource = useMemo(() => {
    const separator = resolvedImage.uri.includes('?') ? '&' : '?';
    return {
      ...resolvedImage,
      uri: `${resolvedImage.uri}${separator}runtimeGeneration=${widgetRuntimeGeneration}&recoveryAttempt=${recoveryAttempt}`,
    };
  }, [recoveryAttempt, resolvedImage]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState<Error>();
  const [lazyLoaded, setLazyLoaded] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    ExpoWidgetFixture: widgetFontAsset,
  });
  const handleLazyReady = useCallback(() => setLazyLoaded(true), []);
  const ready = imageLoaded && fontsLoaded && lazyLoaded;

  if (imageError) throw imageError;
  if (fontError) throw fontError;

  return (
    <View style={styles.card}>
      {ready ? (
        <Text testID="expo-widget-ready">Expo widget resources loaded</Text>
      ) : null}
      <Text>Expo MF v2 widget loaded by Re.Pack.</Text>
      <Text testID="expo-widget-native-module">
        Native app owner: {Constants.expoConfig?.name ?? 'host'}
      </Text>
      <Text testID="expo-widget-public-environment">
        Widget public environment:{' '}
        {process.env.EXPO_PUBLIC_FEDERATION_OWNER ?? 'missing'}
      </Text>
      <Text testID="expo-widget-asset-metadata">
        Widget asset type: {widgetDensityAsset.type}
      </Text>
      {imageLoaded ? (
        <Text testID="expo-widget-image-ready">
          Widget density image loaded
        </Text>
      ) : null}
      <Image
        accessibilityLabel="Density-aware Expo widget image"
        onError={({ nativeEvent }) =>
          setImageError(new Error(nativeEvent.error))
        }
        onLoad={() => setImageLoaded(true)}
        source={imageSource}
        style={styles.image}
        testID="expo-widget-density-image"
      />
      <Text testID="expo-widget-density-scale">
        Selected widget density scale: {resolvedImage.scale}
      </Text>
      <Text testID="expo-widget-device-density-scale">
        Widget device density scale: {PixelRatio.get()}
      </Text>
      {fontsLoaded ? (
        <Text style={styles.fixtureFont} testID="expo-widget-font-ready">
          home
        </Text>
      ) : (
        <Text testID="expo-widget-font-loading">Loading widget font…</Text>
      )}
      <LazyDetailsLoader key={recoveryAttempt} onReady={handleLazyReady} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff7ed',
    borderColor: '#c2410c',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  fixtureFont: {
    fontFamily: 'ExpoWidgetFixture',
    fontSize: 32,
  },
  image: {
    height: 48,
    width: 48,
  },
});
