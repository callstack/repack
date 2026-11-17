import * as React from 'react';
import { type LayoutChangeEvent, Text, View } from 'react-native';

export default function PaddingProbe({
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
      testID="nativewind-padding-box"
      onLayout={handleLayout}
      className="p-2 bg-orange-500"
    >
      <Text testID="nativewind-padding-text" className="text-white">
        The container's padding narrows this box
      </Text>
    </View>
  );
}
