import { Asset } from 'expo-asset';
import { useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import type { LoadState } from '../ui/LoadState';
import Report from '../ui/Report';
import Screen from '../ui/Screen';

const packagedImage = require('../assets/images/repack.png');
const packagedAsset = Asset.fromModule(packagedImage);
const monorepoImage = require('../../../tests/integration/src/loaders/__fixtures__/assets/logo.png');
const monorepoAsset = Asset.fromModule(monorepoImage);

const assetLabel = (state: LoadState, asset: Asset) =>
  state === 'loaded' ? `${asset.name}.${asset.type}` : state;

export default function ImageRoute() {
  const [local, setLocal] = useState<LoadState>('loading');
  const [monorepo, setMonorepo] = useState<LoadState>('loading');

  return (
    <Screen testID="image-screen">
      <Report
        testID="image-local-report"
        name="local"
        value={assetLabel(local, packagedAsset)}
      />
      <Image
        accessibilityLabel="Re.Pack logo from the application bundle"
        onError={() => setLocal('error')}
        onLoad={() => setLocal('loaded')}
        source={packagedImage}
        style={styles.logo}
        testID="app-local-image"
      />
      <Report
        testID="image-monorepo-report"
        name="monorepo"
        value={assetLabel(monorepo, monorepoAsset)}
      />
      <Image
        accessibilityLabel="Logo from a monorepo source fixture"
        onError={() => setMonorepo('error')}
        onLoad={() => setMonorepo('loaded')}
        source={monorepoImage}
        style={styles.monorepoLogo}
        testID="monorepo-image"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: {
    height: 30,
    marginHorizontal: 12,
    width: 147,
  },
  monorepoLogo: {
    height: 64,
    marginHorizontal: 12,
    width: 64,
  },
});
