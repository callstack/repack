import { Text } from 'react-native';

import { cn } from './ui/utils';

export default function CustomComponent({ className }: { className: string }) {
  return (
    <Text
      testID="nativewind-custom-component-text"
      className={cn('p-2 text-black dark:text-white', className)}
    >
      I am a custom component
    </Text>
  );
}
