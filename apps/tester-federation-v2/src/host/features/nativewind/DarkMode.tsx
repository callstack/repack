import { colorScheme } from 'nativewind';
import { Button, Text, View } from 'react-native';

export default function DarkMode() {
  return (
    <View>
      <Button
        testID="nativewind-dark-mode-button"
        onPress={() => {
          colorScheme.toggle();
        }}
        title="Toggle dark mode"
      />
      <View
        testID="nativewind-dark-mode-box"
        className="mt-2 rounded bg-neutral-200 p-4 dark:bg-neutral-900"
      >
        <Text
          testID="nativewind-dark-mode-text"
          className="text-black dark:text-white"
        >
          Inverted by the color scheme
        </Text>
      </View>
    </View>
  );
}
