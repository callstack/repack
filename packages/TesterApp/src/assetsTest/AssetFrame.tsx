import React from 'react';
import {
  Image,
  ImageSourcePropType,
  ImageStyle,
  StyleProp,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export function AssetFrame({
  name,
  source,
  style,
}: {
  name: string;
  source: ImageSourcePropType;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <View style={styles.container}>
      <Text>{name}</Text>
      <Image accessibilityIgnoresInvertColors source={source} style={style} />
      <Text>{`Scale: x${Image.resolveAssetSource(source).scale}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
