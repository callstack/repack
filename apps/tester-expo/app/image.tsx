import { Asset } from 'expo-asset';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const packagedImage = require('../assets/images/repack.png');
const packagedAsset = Asset.fromModule(packagedImage);
const monorepoImage = require('../../../tests/integration/src/loaders/__fixtures__/assets/logo.png');
const monorepoAsset = Asset.fromModule(monorepoImage);

export default function ImageRoute() {
  const [appLocalImageLoaded, setAppLocalImageLoaded] = useState(false);
  const [monorepoImageLoaded, setMonorepoImageLoaded] = useState(false);
  const [imageError, setImageError] = useState<string>();
  const imagesLoaded =
    appLocalImageLoaded && monorepoImageLoaded && !imageError;

  return (
    <View style={styles.container}>
      {imagesLoaded ? (
        <Text testID="image-ready">
          Expo assets loaded: {packagedAsset.name}.{packagedAsset.type} and{' '}
          monorepo {monorepoAsset.name}.{monorepoAsset.type}
        </Text>
      ) : null}
      {imageError ? <Text testID="image-error">{imageError}</Text> : null}
      <Image
        accessibilityLabel="Re.Pack logo from the application bundle"
        onError={() =>
          setImageError((error) => error ?? 'App-local image failed to load')
        }
        onLoad={() => setAppLocalImageLoaded(true)}
        source={packagedImage}
        style={styles.logo}
        testID="app-local-image"
      />
      <Image
        accessibilityLabel="Logo from a monorepo source fixture"
        onError={() =>
          setImageError((error) => error ?? 'Monorepo image failed to load')
        }
        onLoad={() => setMonorepoImageLoaded(true)}
        source={monorepoImage}
        style={styles.monorepoLogo}
        testID="monorepo-image"
      />
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
  logo: {
    height: 30,
    width: 147,
  },
  monorepoLogo: {
    height: 64,
    width: 64,
  },
});
