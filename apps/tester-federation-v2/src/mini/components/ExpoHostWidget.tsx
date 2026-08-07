import { StyleSheet, Text, View } from 'react-native';

export default function ExpoHostWidget() {
  return (
    <View style={styles.card} testID="ordinary-repack-widget-ready">
      <Text>Ordinary Re.Pack MF v2 widget loaded by an Expo host.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#eef2ff',
    borderColor: '#4338ca',
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
});
