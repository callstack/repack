import { useState } from 'react';
import { Image, PixelRatio, StyleSheet } from 'react-native';
import type { LoadState } from '../ui/LoadState';
import Report from '../ui/Report';
import Screen from '../ui/Screen';

const densityImage = require('../assets/images/density.png');

export default function DensityImageRoute() {
  const resolvedImage = Image.resolveAssetSource(densityImage);
  const [load, setLoad] = useState<LoadState>('loading');

  return (
    <Screen testID="density-image-screen">
      <Report testID="density-image-load-report" name="image" value={load} />
      <Report
        testID="density-image-scale-report"
        name="scale"
        value={resolvedImage?.scale}
      />
      <Report
        testID="density-image-pixel-ratio-report"
        name="pixel ratio"
        value={PixelRatio.get()}
      />
      <Image
        accessibilityLabel="Density-aware Rspack logo"
        onError={() => setLoad('error')}
        onLoad={() => setLoad('loaded')}
        source={densityImage}
        style={styles.image}
        testID="density-image"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  image: {
    height: 48,
    marginHorizontal: 12,
    width: 48,
  },
});
