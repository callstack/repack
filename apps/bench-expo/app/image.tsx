import { Asset } from 'expo-asset';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const packagedImage = require('../assets/images/repack.png');
const packagedAsset = Asset.fromModule(packagedImage);

export default function ImageRoute() {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <View style={styles.container}>
      {imageLoaded ? (
        <Text>
          Expo asset loaded: {packagedAsset.name}.{packagedAsset.type}
        </Text>
      ) : null}
      <Image
        accessibilityLabel="Re.Pack logo from the application bundle"
        onLoad={() => setImageLoaded(true)}
        source={packagedImage}
        style={styles.logo}
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
});
