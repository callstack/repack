import { Text, View } from 'react-native';

export default function Basic() {
  return (
    <View
      className="items-center rounded-full bg-blue-100 p-5"
      testID="nativewind-basic-box"
    >
      <Text testID="nativewind-basic-text" className="custom-style-test">
        Colored through CSS!
      </Text>
    </View>
  );
}
