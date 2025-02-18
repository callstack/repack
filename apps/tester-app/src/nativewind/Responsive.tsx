import { Text, View } from 'react-native';

export default function Responsive() {
  return (
    <View className="p-2 bg-orange-500 sm:bg-green-500 md:bg-red-500">
      <Text className="text-white">Responsive style based on width!</Text>
    </View>
  );
}
