import { Link } from 'expo-router';
import { useState } from 'react';
import { Image, PixelRatio, StyleSheet, Text, View } from 'react-native';

const densityImage = require('../assets/images/density.png');

export default function DensityImageRoute() {
  const resolvedImage = Image.resolveAssetSource(densityImage);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <View style={styles.container}>
      {imageLoaded && !imageError ? (
        <Text testID="density-image-ready">
          Density-aware bundled image loaded
        </Text>
      ) : null}
      {imageError ? (
        <Text testID="density-image-error">
          Density-aware bundled image failed to load
        </Text>
      ) : null}
      <Image
        accessibilityLabel="Density-aware Rspack logo"
        onError={() => setImageError(true)}
        onLoad={() => setImageLoaded(true)}
        source={densityImage}
        style={styles.image}
        testID="density-image"
      />
      <Text testID="density-scale">
        Selected density scale: {resolvedImage.scale}
      </Text>
      <Text testID="device-density-scale">
        Device density scale: {PixelRatio.get()}
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
  image: {
    height: 48,
    width: 48,
  },
});
