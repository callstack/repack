import { StyleSheet, View } from 'react-native';
import { AssetFrame } from './AssetFrame';

export function AssetsTestContainer() {
  return (
    <View style={styles.container}>
      <AssetFrame name="local" source={require('./localAssets/webpack.png')} />
      <AssetFrame
        name="inline"
        source={require('./inlineAssets/webpack.png')}
      />
      <AssetFrame
        name="remote"
        source={require('./remoteAssets/webpack.png')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 20,
  },
});
