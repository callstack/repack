import { vars } from 'nativewind';
import * as React from 'react';
import { type LayoutChangeEvent, Text, View } from 'react-native';

export default function FuncsDirs({
  onCalcWidth,
}: {
  onCalcWidth: (width: number) => void;
}) {
  const handleLayout = React.useCallback(
    (event: LayoutChangeEvent) => {
      onCalcWidth(Math.round(event.nativeEvent.layout.width));
    },
    [onCalcWidth]
  );

  return (
    <>
      <View style={vars({ '--my-custom-color': 'green' })}>
        <Text testID="nativewind-vars-text" className="text-custom">
          Custom color
        </Text>
      </View>
      <View
        testID="nativewind-calc-box"
        onLayout={handleLayout}
        className="p-2 calc-element color-element"
      >
        <Text testID="nativewind-calc-text">Calculated size</Text>
      </View>
    </>
  );
}
