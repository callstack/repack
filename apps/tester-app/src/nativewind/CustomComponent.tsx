import { Text } from 'react-native';

export default function CustomComponent({ className }: { className: string }) {
  const defaultStyles = 'p-2 text-black dark:text-white';
  return (
    <Text className={`${defaultStyles} ${className}`}>
      I am a custom component
    </Text>
  );
}
