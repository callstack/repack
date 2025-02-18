import { View } from 'react-native';
import Basic from './Basic.tsx';
import ComponentWithVariants from './ComponentWithVariants.tsx';
import CustomComponent from './CustomComponent.tsx';
import DarkMode from './DarkMode.tsx';
import FuncsDirs from './FuncsDirs.tsx';
import Responsive from './Responsive.tsx';
import Reusables from './Reusables.tsx';

export function NativeWindView() {
  return (
    <View className="gap-4 p-2">
      <Basic />
      <Responsive />
      <CustomComponent className="bg-green-600" />
      <ComponentWithVariants variant="primary" className="bg-yellow-500" />
      <Reusables />
      <DarkMode />
      <FuncsDirs />
    </View>
  );
}
