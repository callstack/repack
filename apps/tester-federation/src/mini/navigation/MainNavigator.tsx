import {
  type NativeStackNavigationProp,
  createNativeStackNavigator,
} from '@react-navigation/native-stack';
import { StyleSheet } from 'react-native';

import GalleryScreen from '../screens/GalleryScreen';
import HomeScreen from '../screens/HomeScreen';

export type MainStackParamList = {
  Home: undefined;
  Gallery: undefined;
};

export type MainStackNavigationProp =
  NativeStackNavigationProp<MainStackParamList>;

const Main = createNativeStackNavigator<MainStackParamList>();

const MainNavigator = () => {
  return (
    <Main.Navigator
      screenOptions={{
        headerTitle: 'MiniApp',
        headerBackTitleVisible: false,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerTintColor: 'rgba(255,255,255,1)',
      }}
    >
      <Main.Screen name="Home" component={HomeScreen} />
      <Main.Screen name="Gallery" component={GalleryScreen} />
    </Main.Navigator>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: 'rgba(79, 55, 139, 1)',
  },
  headerTitle: {
    color: 'rgba(255,255,255,1)',
  },
});

export default MainNavigator;
