import { StyleSheet, Text, View } from 'react-native';
import ComponentWithVariants from './ComponentWithVariants.tsx';
import CustomComponent from './CustomComponent.tsx';
import Reusables from './Reusables.tsx';

export function NativeWindView() {
  return (
    <View className="gap-4 p-2">
      <View
        className="bg-blue-100 p-5 rounded-full sm:bg-red-500"
        style={styles.container}
      >
        <Text className="custom-style-test">Colored through CSS!</Text>
      </View>
      <CustomComponent className="bg-green-600" />
      <ComponentWithVariants variant="primary" className="bg-yellow-500" />
      <Reusables />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
});
