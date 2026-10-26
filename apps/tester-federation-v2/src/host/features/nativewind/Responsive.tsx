import * as React from 'react';
import { type LayoutChangeEvent, Text, View } from 'react-native';

export default function Responsive({
  onWidth,
}: {
  onWidth: (width: number) => void;
}) {
  const handleLayout = React.useCallback(
    (event: LayoutChangeEvent) => {
      onWidth(Math.round(event.nativeEvent.layout.width));
    },
    [onWidth]
  );

  return (
    <View
      testID="nativewind-responsive-box"
      onLayout={handleLayout}
      className="p-2 bg-orange-500"
    >
      <Text testID="nativewind-responsive-text" className="text-white">
        Padding shrinks this box
      </Text>
    </View>
  );
}
