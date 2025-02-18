import { colorScheme } from 'nativewind';
import { Button } from 'react-native';

export default function DarkMode() {
  return (
    <Button
      onPress={() => {
        colorScheme.set('dark');
      }}
      title="Toggle dark mode"
    />
  );
}
