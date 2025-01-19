import { vars } from 'nativewind';
import { Text, View } from 'react-native';

export default function FuncsDirs() {
  return (
    <>
      <View style={vars({ '--my-custom-color': 'green' })}>
        <Text className="text-custom">Custom color</Text>
      </View>
      <View className="p-2 calc-element color-element">
        <Text>Calculated size</Text>
      </View>
    </>
  );
}
