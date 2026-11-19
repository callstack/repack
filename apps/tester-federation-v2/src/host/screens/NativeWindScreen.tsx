import { useColorScheme } from 'nativewind';
import * as React from 'react';
import {
  type LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import Basic from '../features/nativewind/Basic';
import ComponentWithVariants from '../features/nativewind/ComponentWithVariants';
import CustomComponent from '../features/nativewind/CustomComponent';
import DarkMode from '../features/nativewind/DarkMode';
import FuncsDirs from '../features/nativewind/FuncsDirs';
import PaddingProbe from '../features/nativewind/PaddingProbe';
import Reusables from '../features/nativewind/Reusables';
import Report from '../ui/Report';

const NativeWindScreen = () => {
  const { colorScheme } = useColorScheme();
  const [calcWidth, setCalcWidth] = React.useState(0);
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [boxWidth, setBoxWidth] = React.useState(0);

  const handleContainerLayout = React.useCallback(
    (event: LayoutChangeEvent) => {
      setContainerWidth(Math.round(event.nativeEvent.layout.width));
    },
    []
  );

  return (
    <ScrollView
      testID="nativewind-screen"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <View style={styles.container}>
        <View className="gap-4 p-2" onLayout={handleContainerLayout}>
          <Basic />
          <PaddingProbe onWidth={setBoxWidth} />
          <CustomComponent className="bg-green-600" />
          <ComponentWithVariants variant="primary" />
          <Reusables />
          <DarkMode />
          <FuncsDirs onCalcWidth={setCalcWidth} />
        </View>
        <Report
          testID="nativewind-color-scheme-report"
          name="color-scheme"
          value={colorScheme}
        />
        <Report
          testID="nativewind-calc-width-report"
          name="calc-width"
          value={calcWidth}
        />
        <Report
          testID="nativewind-padding-report"
          name="padding-applied"
          value={
            containerWidth && boxWidth ? containerWidth - boxWidth : 'pending'
          }
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingVertical: 16,
  },
  container: {
    paddingHorizontal: 16,
    gap: 4,
  },
});

export default NativeWindScreen;
